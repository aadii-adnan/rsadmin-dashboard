from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from bookings.models import Booking
from payments.models import Payment
from .models import Expense, SupplierInvoice
from users.models import Supplier
from datetime import datetime, timedelta, time
from django.db.models import Sum
from .serializers import ExpenseSerializer
from django.shortcuts import get_object_or_404
from rest_framework import status
from core.models import Status
from services.models import Service, AddOn
from decimal import Decimal
from datetime import date
from django.utils import timezone
from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.tokens import RefreshToken
from django.http import HttpResponseRedirect, HttpResponse
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from dateutil.relativedelta import relativedelta
from django.template.loader import render_to_string
from django.conf import settings
from io import BytesIO
import base64
import calendar as cal_module
from bookings.tasks import (
    GMASS_TEST_RECIPIENTS,
    PROMOTIONAL_CAMPAIGNS,
    send_promotional_deliverability_test,
)

@login_required
def finance_jwt_login(request):
    user = request.user
    if not (
        user.is_superuser
        and not getattr(user, 'is_manager', False)
        and not getattr(user, 'is_supplier', False)
    ):
        return HttpResponseRedirect('/admin/login/?next=/admin-dashboard/finance/')
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)
    refresh_token = str(refresh)
    # Redirect to React dashboard with tokens in URL (or use POST if you prefer)
    redirect_url = f"/finance-dashboard/?access={access}&refresh={refresh_token}"
    return HttpResponseRedirect(redirect_url)

def count_overlapping_months(start1, end1, start2, end2):
    """
    Returns the number of months (as int) that [start1, end1] and [start2, end2] overlap.
    Both intervals are inclusive.
    """
    latest_start = max(start1, start2)
    earliest_end = min(end1, end2)
    if latest_start > earliest_end:
        return 0
    # Count months inclusive
    months = (earliest_end.year - latest_start.year) * 12 + (earliest_end.month - latest_start.month) + 1
    return months

class IsSuperAdminNotManager(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated
            and user.is_superuser
            and not getattr(user, 'is_manager', False)
            and not getattr(user, 'is_supplier', False)
        )


class EmailDeliverabilityTestView(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def post(self, request):
        campaign = request.data.get("campaign")
        campaign_config = PROMOTIONAL_CAMPAIGNS.get(campaign)
        if not campaign_config:
            return Response(
                {
                    "error": "Invalid campaign.",
                    "allowed_campaigns": list(PROMOTIONAL_CAMPAIGNS),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        task = send_promotional_deliverability_test.delay(campaign)
        sender_email = campaign_config["sender_email"]
        return Response(
            {
                "message": "Deliverability test queued.",
                "task_id": str(task.id),
                "campaign": campaign,
                "label": campaign_config["label"],
                "sender": f'{campaign_config["sender_name"]} <{sender_email}>',
                "subject": campaign_config["subject"],
                "recipient_count": len(GMASS_TEST_RECIPIENTS),
            },
            status=status.HTTP_202_ACCEPTED,
        )


def calculate_payment_earning(payment, booking_status):
    """
    Returns the earning for a single payment, considering cancellation fee.
    """
    status_name = booking_status.name.lower() if booking_status else ""
    if status_name == "cancelled":
        return Decimal('15.00')
    elif status_name in ["confirmed", "rescheduled", "completed", "no show"]:
        return payment.amount
    else:
        return Decimal('0.00')

def apply_supplier_deduction(amount, booking):
    """
    For supplier bookings, deduct the supplier's commission and return only our share.
    E.g., if commission is 30%, return 70% of the amount.
    """
    if booking.supplier:
        commission = get_booking_supplier_commission_ratio(booking)
        return Decimal(str(amount)) * (Decimal('1') - commission)
    return amount


def get_booking_supplier_commission_percentage(booking):
    if not booking.supplier:
        return Decimal('0.00')
    if booking.supplier_commission_percentage is not None:
        return Decimal(str(booking.supplier_commission_percentage))
    return Decimal(str(booking.supplier.commission_percentage))


def get_booking_supplier_commission_ratio(booking):
    return get_booking_supplier_commission_percentage(booking) / Decimal('100')


def get_supplier_extension_amount(booking):
    if booking.supplier:
        return Decimal(str(booking.supplier_extended_amount or 0))
    return Decimal('0.00')


def get_booking_price_amount(booking):
    price = booking.discounted_price if (booking.discounted_price and booking.discounted_price > 0) else booking.total_price
    return Decimal(str(price))


def get_booking_supplier_split_base_amount(booking):
    price = get_booking_price_amount(booking)
    addons_total = sum([addon.price for addon in booking.add_ons.all()])
    extension_amount = get_supplier_extension_amount(booking)
    split_base = price - Decimal(addons_total) - extension_amount
    return max(split_base, Decimal('0.00'))


def get_booking_supplier_share_amount(booking):
    split_base = get_booking_supplier_split_base_amount(booking)
    return split_base * get_booking_supplier_commission_ratio(booking)


def get_supplier_visible_booking_price(booking):
    price = get_booking_price_amount(booking)
    if booking.supplier:
        return max(price - get_supplier_extension_amount(booking), Decimal('0.00'))
    return price


def get_booking_balance_amount(booking):
    price = get_booking_price_amount(booking)
    if booking.supplier:
        addons_total = sum([addon.price for addon in booking.add_ons.all()])
        split_base = get_booking_supplier_split_base_amount(booking)
        return apply_supplier_deduction(split_base, booking) + Decimal(addons_total) + get_supplier_extension_amount(booking)
    return price


def get_booking_net_earning(booking):
    addons_total = sum([addon.price for addon in booking.add_ons.all()])
    price = get_booking_price_amount(booking)
    if booking.supplier:
        split_base = get_booking_supplier_split_base_amount(booking)
        return apply_supplier_deduction(split_base, booking) + get_supplier_extension_amount(booking)
    return price - Decimal(addons_total)


def should_count_booking_for_earnings(booking):
    status_name = booking.status.name.lower() if booking.status else ""
    if status_name in ("completed", "cancelled", "no show"):
        return True
    return bool(booking.supplier and status_name == "started")


def should_count_supplier_commission_status(status_name):
    return status_name in ("started", "completed", "cancelled", "no show")


SUPPLIER_EARNING_STATUSES = ("Cancelled", "Started", "Completed", "No Show")

FINANCE_WEBSITES = {"rsexpressparking", "dublinairportparking"}


def _month_start(value, field_name):
    try:
        return datetime.strptime(value, "%Y-%m").date().replace(day=1)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must use YYYY-MM format.")


def _month_end(value):
    return value + relativedelta(months=1) - timedelta(days=1)


def resolve_finance_period(query_params, booking_queryset=None):
    """Resolve canonical and legacy dashboard period parameters."""
    period_type = query_params.get("period_type")
    legacy_all = query_params.get("all") == "true"
    legacy_month = query_params.get("month")
    year_value = query_params.get("year")
    start_value = query_params.get("start_month") or legacy_month
    end_value = query_params.get("end_month") or start_value

    if not period_type:
        if legacy_all:
            period_type = "all"
        elif year_value:
            period_type = "year"
        elif start_value:
            period_type = "range"
        else:
            period_type = "range"
            start_value = timezone.localdate().strftime("%Y-%m")
            end_value = start_value

    if period_type == "all":
        queryset = booking_queryset if booking_queryset is not None else Booking.objects.all()
        first_booking = queryset.order_by("created_at").first()
        last_booking = queryset.order_by("-created_at").first()
        if not first_booking or not last_booking:
            raise ValueError("No bookings found.")
        return (
            first_booking.created_at.date(),
            last_booking.created_at.date(),
            "All time",
            "all",
        )

    if period_type == "year":
        try:
            selected_year = int(year_value)
        except (TypeError, ValueError):
            raise ValueError("year must be a four-digit year.")
        if selected_year < 2000 or selected_year > 2100:
            raise ValueError("year must be between 2000 and 2100.")
        return (
            date(selected_year, 1, 1),
            date(selected_year, 12, 31),
            str(selected_year),
            "year",
        )

    if period_type != "range":
        raise ValueError("period_type must be range, year, or all.")

    start_date = _month_start(start_value, "start_month")
    end_month = _month_start(end_value, "end_month")
    if start_date > end_month:
        raise ValueError("start_month cannot be after end_month.")
    end_date = _month_end(end_month)
    label = (
        start_date.strftime("%B %Y")
        if start_date == end_month
        else f"{start_date.strftime('%b %Y')} – {end_month.strftime('%b %Y')}"
    )
    return start_date, end_date, label, "range"


def resolve_finance_website(query_params):
    website = (query_params.get("website") or "all").lower()
    if website != "all" and website not in FINANCE_WEBSITES:
        raise ValueError("website must be all, rsexpressparking, or dublinairportparking.")
    return website


def finance_booking_queryset(start_date, end_date, website, include_all_statuses=False):
    start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
    end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
    queryset = Booking.objects.filter(
        created_at__gte=start_datetime,
        created_at__lte=end_datetime,
    )
    if not include_all_statuses:
        queryset = queryset.exclude(status__name__in=["Pending", "Payment Failed"])
    if website != "all":
        queryset = queryset.filter(website__iexact=website)
    return queryset.select_related("service", "status", "supplier").prefetch_related("add_ons")


def finance_expense_snapshot(start_date, end_date, website):
    expense_filter = {}
    if website != "all":
        expense_filter["website__in"] = [website, "both"]

    fixed_expenses = Expense.objects.filter(
        recurring=False,
        for_month__gte=start_date,
        for_month__lte=end_date,
        **expense_filter,
    )
    recurring_expenses = Expense.objects.filter(
        recurring=True,
        **expense_filter,
    ).filter(
        Q(recurring_start_month__lte=end_date) | Q(recurring_start_month__isnull=True),
        Q(recurring_end_month__gte=start_date) | Q(recurring_end_month__isnull=True),
    )
    recurring_total = Decimal("0.00")
    for expense in recurring_expenses:
        months = count_overlapping_months(
            start_date,
            end_date,
            expense.recurring_start_month or start_date,
            expense.recurring_end_month or end_date,
        )
        recurring_total += expense.amount * Decimal(months)
    return fixed_expenses, recurring_expenses, sum(
        (expense.amount for expense in fixed_expenses),
        Decimal("0.00"),
    ) + recurring_total


def finance_metric_snapshot(start_date, end_date, website):
    bookings = finance_booking_queryset(start_date, end_date, website)
    balance = sum((get_booking_balance_amount(booking) for booking in bookings), Decimal("0.00"))
    earnings = sum(
        (
            get_booking_net_earning(booking)
            for booking in bookings
            if should_count_booking_for_earnings(booking)
        ),
        Decimal("0.00"),
    )
    _, _, expenses = finance_expense_snapshot(start_date, end_date, website)
    return {
        "balance": balance,
        "earnings": earnings,
        "expenses": expenses,
        "profit_or_loss": earnings - expenses,
    }


def previous_finance_period(start_date, end_date, period_type):
    if period_type == "all":
        return None
    months = (end_date.year - start_date.year) * 12 + end_date.month - start_date.month + 1
    previous_end = start_date - timedelta(days=1)
    previous_start = start_date - relativedelta(months=months)
    return previous_start, previous_end


def finance_comparison(current, previous):
    comparison = {}
    for key, current_value in current.items():
        previous_value = previous[key]
        delta = current_value - previous_value
        percent = (
            (delta / abs(previous_value)) * Decimal("100")
            if previous_value != 0
            else None
        )
        comparison[key] = {
            "previous": float(previous_value),
            "delta": float(delta),
            "percent": round(float(percent), 2) if percent is not None else None,
        }
    return comparison


def finance_trend(start_date, end_date, website):
    points = []
    is_single_month = start_date.year == end_date.year and start_date.month == end_date.month
    bookings = list(finance_booking_queryset(start_date, end_date, website))

    def booking_values(period_bookings):
        balance = sum(
            (get_booking_balance_amount(booking) for booking in period_bookings),
            Decimal("0.00"),
        )
        earnings = sum(
            (
                get_booking_net_earning(booking)
                for booking in period_bookings
                if should_count_booking_for_earnings(booking)
            ),
            Decimal("0.00"),
        )
        return balance, earnings

    if is_single_month:
        _, _, period_expenses = finance_expense_snapshot(start_date, end_date, website)
        day_count = (end_date - start_date).days + 1
        daily_expense = (period_expenses / Decimal(day_count)).quantize(Decimal("0.01"))
        allocated_expenses = Decimal("0.00")
        cursor = start_date
        while cursor <= end_date:
            daily_bookings = [
                booking
                for booking in bookings
                if timezone.localtime(booking.created_at).date() == cursor
            ]
            balance, earnings = booking_values(daily_bookings)
            expense_for_day = (
                period_expenses - allocated_expenses
                if cursor == end_date
                else daily_expense
            )
            allocated_expenses += expense_for_day
            points.append({
                "period": cursor.isoformat(),
                "balance": round(float(balance), 2),
                "earnings": round(float(earnings), 2),
                "expenses": round(float(expense_for_day), 2),
                "profit_or_loss": round(float(earnings - expense_for_day), 2),
            })
            cursor += timedelta(days=1)
        return points

    cursor = start_date.replace(day=1)
    while cursor <= end_date:
        bucket_start = max(cursor, start_date)
        bucket_end = min(_month_end(cursor), end_date)
        bucket_bookings = [
            booking
            for booking in bookings
            if bucket_start <= timezone.localtime(booking.created_at).date() <= bucket_end
        ]
        balance, earnings = booking_values(bucket_bookings)
        _, _, expenses = finance_expense_snapshot(bucket_start, bucket_end, website)
        points.append({
            "period": cursor.strftime("%Y-%m"),
            "balance": round(float(balance), 2),
            "earnings": round(float(earnings), 2),
            "expenses": round(float(expenses), 2),
            "profit_or_loss": round(float(earnings - expenses), 2),
        })
        cursor += relativedelta(months=1)
    return points

class AdminFinancialOverview(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def get(self, request):
        try:
            start_date, end_date, period_label, period_type = resolve_finance_period(
                request.query_params
            )
            website = resolve_finance_website(request.query_params)
            all_time = "true" if period_type == "all" else None
            year_str = str(start_date.year) if period_type == "year" else None
            year = start_date.year

            start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
            end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))

            # Get all relevant bookings in this period
            bookings_in_period = finance_booking_queryset(
                start_date,
                end_date,
                website,
            )

            supplier_summary_bookings = Booking.objects.filter(
                supplier__isnull=False,
                status__name__in=SUPPLIER_EARNING_STATUSES,
            )
            if all_time != "true":
                supplier_summary_bookings = supplier_summary_bookings.filter(
                    departure_time__gte=start_datetime,
                    departure_time__lte=end_datetime,
                )
            if website and website.lower() != "all":
                supplier_summary_bookings = supplier_summary_bookings.filter(website__iexact=website)
            supplier_summary_bookings = supplier_summary_bookings.select_related(
                'service', 'status', 'supplier'
            ).prefetch_related('add_ons')

            all_addons_total = 0
            for booking in bookings_in_period.exclude(status__name="Cancelled"):
                all_addons_total += sum([addon.price for addon in booking.add_ons.all()])

            # Calculate total balance (deduct supplier's cut for vendor bookings)
            # For supplier bookings: addons go to third party, commission only on base price
            total_balance = Decimal('0.00')
            for booking in bookings_in_period:
                total_balance += get_booking_balance_amount(booking)

            # Calculate total earnings.
            # Supplier bookings are counted from Started onward (departure done).
            total_earnings = Decimal('0.00')
            for booking in bookings_in_period:
                if should_count_booking_for_earnings(booking):
                    total_earnings += get_booking_net_earning(booking)
                # else: do not count for earnings

            # Expenses for this period
            expense_filter = {}
            if website and website.lower() != "all":
                expense_filter["website__in"] = [website, "both"]

            if all_time == "true":
                fixed_expenses = Expense.objects.filter(recurring=False, **expense_filter)
            elif year_str:
                fixed_expenses = Expense.objects.filter(
                    recurring=False,
                    for_month__year=year,
                    **expense_filter
                )
            else:
                fixed_expenses = Expense.objects.filter(
                    recurring=False,
                    for_month__gte=start_date,
                    for_month__lte=end_date,
                    **expense_filter
                )
            recurring_expenses = Expense.objects.filter(
                recurring=True,
                **expense_filter
            ).filter(
                Q(recurring_start_month__lte=end_date) | Q(recurring_start_month__isnull=True),
                Q(recurring_end_month__gte=start_date) | Q(recurring_end_month__isnull=True)
            )

            recurring_total = Decimal('0.00')
            for e in recurring_expenses:
                exp_start = e.recurring_start_month or start_date
                exp_end = e.recurring_end_month or end_date
                months = count_overlapping_months(start_date, end_date, exp_start, exp_end)
                recurring_total += (e.amount * Decimal(months))

            total_expenses = sum(e.amount for e in fixed_expenses) + recurring_total
            profit = total_earnings - total_expenses

            # Service earning details (use new earning logic)
            service_details = []
            for service in Service.objects.all():
                service_bookings = bookings_in_period.filter(service=service)
                completed_orders = service_bookings.filter(status__name="Completed").count()
                cancelled_orders = service_bookings.filter(status__name="Cancelled").count()
                completed_earning = sum(
                    get_booking_net_earning(b)
                    for b in service_bookings.filter(status__name="Completed")
                )
                cancelled_earning = sum(
                    get_booking_net_earning(b)
                    for b in service_bookings.filter(status__name="Cancelled")
                )
                service_details.append({
                    "service_id": service.id,
                    "service_name": service.name,
                    "eligible_orders": service_bookings.count(),
                    # Retained for compatibility with the previous dashboard.
                    "completed_orders": service_bookings.count(),
                    "cancelled_orders": cancelled_orders,
                    "completed_earning": float(completed_earning),
                    "cancelled_earning": float(cancelled_earning),
                })

            # Addon earning details (optional: you may want to update this logic as well)
            # Addon earning details
            addon_details = []
            for addon in AddOn.objects.all():
                addon_bookings = bookings_in_period.filter(add_ons=addon)
                completed_orders = addon_bookings.filter(status__name__in=["Completed", "Confirmed", "Rescheduled", "Started", "No Show"]).count()
                cancelled_orders = addon_bookings.filter(status__name="Cancelled").count()
                # Addon revenue from supplier bookings goes straight to third party — exclude from our earnings
                completed_earning = Decimal('0.00')
                for b in addon_bookings.filter(status__name__in=["Completed", "Confirmed", "Rescheduled", "Started", "No Show"]):
                    if not b.supplier:
                        completed_earning += Decimal(addon.price)
                cancelled_earning = Decimal('0.00')
                for b in addon_bookings.filter(status__name="Cancelled"):
                    if not b.supplier:
                        cancelled_earning += Decimal(addon.price)
                addon_details.append({
                    "addon_id": addon.id,
                    "addon_name": addon.name,
                    "completed_orders": completed_orders,
                    "cancelled_orders": cancelled_orders,
                    "completed_earning": float(completed_earning),
                    "cancelled_earning": float(cancelled_earning),
                })

            # Marketing source breakdown (bookings + earnings per channel)
            source_details = []
            source_channels = (
                bookings_in_period
                .values_list('source_channel', flat=True)
                .distinct()
            )
            for channel in source_channels:
                channel_bookings = bookings_in_period.filter(source_channel=channel)
                channel_earning = sum(
                    get_booking_net_earning(b)
                    for b in channel_bookings
                    if should_count_booking_for_earnings(b)
                )
                source_details.append({
                    "source_channel": channel or "Unknown",
                    "total_orders": channel_bookings.count(),
                    "earning": float(channel_earning),
                })
            source_details.sort(key=lambda s: s["total_orders"], reverse=True)

            current_metrics = {
                "balance": total_balance,
                "earnings": total_earnings,
                "expenses": total_expenses,
                "profit_or_loss": profit,
            }
            prior_dates = previous_finance_period(start_date, end_date, period_type)
            comparison_dates = None
            comparison = None
            if prior_dates:
                prior_start, prior_end = prior_dates
                previous_metrics = finance_metric_snapshot(prior_start, prior_end, website)
                comparison = finance_comparison(current_metrics, previous_metrics)
                comparison_dates = {
                    "start_date": prior_start.isoformat(),
                    "end_date": prior_end.isoformat(),
                }

            def serialize_expense(expense, months_counted=1):
                return {
                    "id": expense.id,
                    "name": expense.name,
                    "amount": float(expense.amount),
                    "recurring": expense.recurring,
                    "for_month": expense.for_month.isoformat() if expense.for_month else None,
                    "recurring_start_month": (
                        expense.recurring_start_month.isoformat()
                        if expense.recurring_start_month
                        else None
                    ),
                    "recurring_end_month": (
                        expense.recurring_end_month.isoformat()
                        if expense.recurring_end_month
                        else None
                    ),
                    "website": expense.website,
                    "months_counted": months_counted,
                    "total": float(expense.amount * Decimal(months_counted)),
                }

            return Response({
                'period': period_label,
                'balance': float(total_balance),
                'earnings': float(total_earnings),
                'expenses': float(total_expenses),
                'profit_or_loss': float(profit),
                'scope': {
                    'period_type': period_type,
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'website': website,
                    'comparison': comparison_dates,
                },
                'comparison': comparison,
                'trend': finance_trend(start_date, end_date, website),
                'details': {
                    'fixed_expenses': [serialize_expense(e) for e in fixed_expenses],
                    'recurring_expenses': [
                        serialize_expense(
                            e,
                            count_overlapping_months(
                                start_date,
                                end_date,
                                e.recurring_start_month or start_date,
                                e.recurring_end_month or end_date,
                            ),
                        )
                        for e in recurring_expenses
                    ],
                    'service_details': service_details,
                    'addon_details': addon_details,
                    'source_details': source_details,
                    'all_addons_total': float(all_addons_total),
                },
                'supplier_summary': self._build_supplier_summary(supplier_summary_bookings),
            })

        except ValueError as e:
            return Response({'error': str(e)}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def _build_supplier_summary(self, bookings_in_period):
        """Build supplier financial summary from bookings queryset."""
        supplier_bookings = bookings_in_period.filter(
            supplier__isnull=False,
            status__name__in=SUPPLIER_EARNING_STATUSES,
        ).select_related('supplier')
        suppliers_data = []
        total_supplier_revenue = Decimal('0.00')
        total_given_to_suppliers = Decimal('0.00')
        total_kept_from_suppliers = Decimal('0.00')
        total_extended_amount = Decimal('0.00')

        for supplier in Supplier.objects.filter(is_active=True):
            s_bookings = supplier_bookings.filter(supplier=supplier)
            if not s_bookings.exists():
                continue

            total_revenue = Decimal('0.00')
            supplier_share = Decimal('0.00')
            supplier_extended_amount = Decimal('0.00')
            for b in s_bookings:
                status_name = b.status.name.lower() if b.status else ''
                if should_count_supplier_commission_status(status_name):
                    split_base = get_booking_supplier_split_base_amount(b)
                    total_revenue += split_base
                    supplier_share += get_booking_supplier_share_amount(b)
                    supplier_extended_amount += get_supplier_extension_amount(b)

            our_share = total_revenue - supplier_share + supplier_extended_amount
            effective_commission_percentage = (
                (supplier_share / total_revenue) * Decimal('100')
                if total_revenue > 0
                else Decimal('0.00')
            ).quantize(Decimal('0.01'))

            suppliers_data.append({
                'supplier_id': supplier.id,
                'supplier_name': supplier.name,
                'prefix': supplier.booking_id_prefix,
                'total_bookings': s_bookings.count(),
                'total_revenue': float(total_revenue),
                'supplier_share': float(supplier_share),
                'our_share': float(our_share),
                'extended_amount': float(supplier_extended_amount),
                'commission_percentage': float(effective_commission_percentage),
            })

            total_supplier_revenue += total_revenue
            total_given_to_suppliers += supplier_share
            total_kept_from_suppliers += our_share
            total_extended_amount += supplier_extended_amount

        return {
            'suppliers': suppliers_data,
            'totals': {
                'total_supplier_revenue': float(total_supplier_revenue),
                'total_given_to_suppliers': float(total_given_to_suppliers),
                'total_kept_from_suppliers': float(total_kept_from_suppliers),
                'total_extended_amount': float(total_extended_amount),
            }
        }
        

class AddExpenseView(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def post(self, request):
        serializer = ExpenseSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Expense added successfully'})
        return Response(serializer.errors, status=400)       

class UpdateExpenseView(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def put(self, request, pk):
        expense = get_object_or_404(Expense, id=pk)
        serializer = ExpenseSerializer(expense, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Expense updated successfully.'})
        return Response(serializer.errors, status=400)

class DeleteExpenseView(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def delete(self, request, pk):
        expense = get_object_or_404(Expense, id=pk)
        expense.delete()
        return Response({'message': 'Expense deleted successfully.'})


class BookingsSummaryView(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def get(self, request):
        try:
            start_date, end_date, _, _ = resolve_finance_period(request.query_params)
            website = resolve_finance_website(request.query_params)
            bookings = finance_booking_queryset(
                start_date,
                end_date,
                website,
                include_all_statuses=True,
            )
            statuses = Status.objects.filter(type='booking')
            return Response({
                status.name: bookings.filter(status=status).count()
                for status in statuses
            })
        except ValueError as error:
            return Response({"error": str(error)}, status=400)
    
class OrdersCountByServiceAndAddOnView(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def get(self, request):
        try:
            start_date, end_date, _, _ = resolve_finance_period(request.query_params)
            website = resolve_finance_website(request.query_params)
            bookings = finance_booking_queryset(
                start_date,
                end_date,
                website,
                include_all_statuses=True,
            )
            return Response({
                "services": [
                    {
                        "service_id": service.id,
                        "service_name": service.name,
                        "orders_count": bookings.filter(service=service).count(),
                    }
                    for service in Service.objects.all()
                ],
                "addons": [
                    {
                        "addon_id": addon.id,
                        "addon_name": addon.name,
                        "orders_count": bookings.filter(add_ons=addon).count(),
                    }
                    for addon in AddOn.objects.all()
                ],
            })
        except ValueError as error:
            return Response({"error": str(error)}, status=400)
    

class MonthlyEarningsTrendView(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def get(self, request):
        # Last 12 months
        today = timezone.now().date()
        months = []
        for i in range(11, -1, -1):
            month = (today.replace(day=1) - timedelta(days=30*i)).replace(day=1)
            months.append(month)
        months = sorted(set(months))
        data = []
        for month in months:
            start = month
            if month.month == 12:
                end = month.replace(year=month.year+1, month=1, day=1) - timedelta(days=1)
            else:
                end = month.replace(month=month.month+1, day=1) - timedelta(days=1)
            start_dt = timezone.make_aware(datetime.combine(start, datetime.min.time()))
            end_dt = timezone.make_aware(datetime.combine(end, datetime.max.time()))
            bookings = Booking.objects.filter(
                created_at__gte=start_dt,
                created_at__lte=end_dt
            ).exclude(
                status__name__in=["Pending", "Payment Failed"]
            ).select_related('status', 'supplier').prefetch_related('add_ons')
            earning = Decimal('0.00')
            for b in bookings:
                if should_count_booking_for_earnings(b):
                    earning += get_booking_net_earning(b)
                # else: do not count for earnings
            data.append({
                "month": start.strftime("%Y-%m"),
                "earning": round(float(earning), 2)
            })
        return Response(data)

class BookingsOverTimeView(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def get(self, request):
        try:
            start_date, end_date, _, _ = resolve_finance_period(request.query_params)
            website = resolve_finance_website(request.query_params)
            bookings = finance_booking_queryset(start_date, end_date, website)
            data = []
            is_single_month = (
                start_date.year == end_date.year
                and start_date.month == end_date.month
            )

            if is_single_month:
                cursor = start_date
                while cursor <= end_date:
                    next_day = cursor + timedelta(days=1)
                    start_dt = timezone.make_aware(datetime.combine(cursor, time.min))
                    end_dt = timezone.make_aware(datetime.combine(next_day, time.min))
                    data.append({
                        "date": cursor.isoformat(),
                        "bookings": bookings.filter(
                            created_at__gte=start_dt,
                            created_at__lt=end_dt,
                        ).count(),
                    })
                    cursor = next_day
            else:
                cursor = start_date.replace(day=1)
                while cursor <= end_date:
                    bucket_start = max(cursor, start_date)
                    bucket_end = min(_month_end(cursor), end_date)
                    start_dt = timezone.make_aware(datetime.combine(bucket_start, time.min))
                    end_dt = timezone.make_aware(
                        datetime.combine(bucket_end, datetime.max.time())
                    )
                    data.append({
                        "date": cursor.strftime("%Y-%m"),
                        "bookings": bookings.filter(
                            created_at__gte=start_dt,
                            created_at__lte=end_dt,
                        ).count(),
                    })
                    cursor += relativedelta(months=1)

            return Response(data)
        except ValueError as error:
            return Response({"error": str(error)}, status=400)

class ExpenseBreakdownView(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def get(self, request):
        # Current month
        today = timezone.now().date()
        start = today.replace(day=1)
        if start.month == 12:
            end = start.replace(year=start.year+1, month=1, day=1) - timedelta(days=1)
        else:
            end = start.replace(month=start.month+1, day=1) - timedelta(days=1)
        fixed = Expense.objects.filter(for_month__year=start.year, for_month__month=start.month)
        recurring = Expense.objects.filter(recurring=True)
        data = [
            {"type": "Fixed", "amount": float(sum(e.amount for e in fixed))},
            {"type": "Recurring", "amount": float(sum(e.amount for e in recurring))}
        ]
        return Response(data)

class ProfitMarginOverTimeView(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def get(self, request):
        # Last 12 months
        today = timezone.now().date()
        months = []
        for i in range(11, -1, -1):
            month = (today.replace(day=1) - timedelta(days=30*i)).replace(day=1)
            months.append(month)
        months = sorted(set(months))
        data = []
        for month in months:
            start = month
            if month.month == 12:
                end = month.replace(year=month.year+1, month=1, day=1) - timedelta(days=1)
            else:
                end = month.replace(month=month.month+1, day=1) - timedelta(days=1)
            start_dt = timezone.make_aware(datetime.combine(start, datetime.min.time()))
            end_dt = timezone.make_aware(datetime.combine(end, datetime.max.time()))
            payments = Payment.objects.filter(
                created_at__gte=start_dt,
                created_at__lte=end_dt,
                status__name="Succeeded"
            )
            earning = sum(p.amount for p in payments)
            fixed = Expense.objects.filter(for_month__year=start.year, for_month__month=start.month)
            recurring = Expense.objects.filter(recurring=True)
            expenses = sum(e.amount for e in fixed) + sum(e.amount for e in recurring)
            profit = earning - expenses
            margin = (profit / earning * 100) if earning > 0 else 0
            data.append({
                "month": start.strftime("%Y-%m"),
                "profit_margin": round(margin, 2),
                "profit": float(profit),
                "earning": float(earning),
                "expenses": float(expenses)
            })
        return Response(data)


class SupplierFinanceDetailView(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def get(self, request, supplier_id):
        from django.shortcuts import get_object_or_404 as get_or_404
        supplier = get_or_404(Supplier, id=supplier_id)

        try:
            supplier_bookings = Booking.objects.filter(supplier=supplier)
            start_date, end_date, _, period_type = resolve_finance_period(
                request.query_params,
                booking_queryset=supplier_bookings,
            )
            website = resolve_finance_website(request.query_params)
            all_time = period_type == "all"

            start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
            end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))

            bookings = Booking.objects.filter(
                supplier=supplier,
                status__name__in=SUPPLIER_EARNING_STATUSES,
            )
            if not all_time:
                bookings = bookings.filter(
                    departure_time__gte=start_datetime,
                    departure_time__lte=end_datetime,
                )
            if website != "all":
                bookings = bookings.filter(website__iexact=website)
            bookings = bookings.select_related(
                'status', 'service'
            ).prefetch_related('add_ons').order_by('departure_time')

            total_revenue = Decimal('0.00')
            supplier_share = Decimal('0.00')
            total_extended_amount = Decimal('0.00')
            bookings_list = []
            for b in bookings:
                status_name = b.status.name.lower() if b.status else ''
                price = get_supplier_visible_booking_price(b)
                if should_count_supplier_commission_status(status_name):
                    earning = get_booking_supplier_split_base_amount(b)
                    supplier_share += get_booking_supplier_share_amount(b)
                    extended_amount = get_supplier_extension_amount(b)
                    total_extended_amount += extended_amount
                else:
                    earning = Decimal('0.00')
                    extended_amount = Decimal('0.00')
                total_revenue += earning

                bookings_list.append({
                    'booking_id': b.booking_id,
                    'customer_name': f"{b.first_name} {b.last_name}",
                    'departure_time': b.departure_time.isoformat(),
                    'return_time': b.return_time.isoformat(),
                    'price': float(price),
                    'earning': float(earning),
                    'extended_amount': float(extended_amount),
                    'status': b.status.name if b.status else '',
                })

            our_share = total_revenue - supplier_share + total_extended_amount
            effective_commission_percentage = (
                (supplier_share / total_revenue) * Decimal('100')
                if total_revenue > 0
                else Decimal('0.00')
            ).quantize(Decimal('0.01'))

            return Response({
                'supplier_id': supplier.id,
                'supplier_name': supplier.name,
                'prefix': supplier.booking_id_prefix,
                'commission_percentage': float(effective_commission_percentage),
                'total_bookings': len(bookings_list),
                'total_revenue': float(total_revenue),
                'supplier_share': float(supplier_share),
                'our_share': float(our_share),
                'total_extended_amount': float(total_extended_amount),
                'bookings': bookings_list,
            })

        except ValueError as e:
            return Response({'error': str(e)}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class SupplierInvoicePDFView(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def get(self, request, supplier_id):
        import weasyprint

        supplier = get_object_or_404(Supplier, id=supplier_id)

        month_str = request.query_params.get('month')
        year_str = request.query_params.get('year')
        if not month_str or not year_str:
            return Response({'error': 'month and year are required.'}, status=400)

        try:
            month = int(month_str)
            year = int(year_str)
            if not (1 <= month <= 12):
                raise ValueError
        except ValueError:
            return Response({'error': 'Invalid month or year.'}, status=400)

        invoice_obj, _ = SupplierInvoice.objects.get_or_create(
            supplier=supplier,
            period_month=month,
            period_year=year,
            defaults={'invoice_number': self._next_invoice_number(supplier)},
        )

        start_date = date(year, month, 1)
        last_day = cal_module.monthrange(year, month)[1]
        end_date = date(year, month, last_day)
        start_dt = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_dt = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))

        bookings = (
            Booking.objects.filter(
                supplier=supplier,
                departure_time__gte=start_dt,
                departure_time__lte=end_dt,
                status__name__in=SUPPLIER_EARNING_STATUSES,
            )
            .select_related('status')
            .prefetch_related('add_ons')
        )

        total_revenue = Decimal('0.00')
        supplier_share = Decimal('0.00')
        completed_count = 0
        started_count = 0
        cancelled_count = 0
        no_show_count = 0
        for b in bookings:
            status_name = b.status.name.lower() if b.status else ''
            if should_count_supplier_commission_status(status_name):
                total_revenue += get_booking_supplier_split_base_amount(b)
                supplier_share += get_booking_supplier_share_amount(b)

            if status_name == 'completed':
                completed_count += 1
            elif status_name == 'started':
                started_count += 1
            elif status_name == 'cancelled':
                cancelled_count += 1
            elif status_name == 'no show':
                no_show_count += 1

        effective_commission_percentage = (
            (supplier_share / total_revenue) * Decimal('100')
            if total_revenue > 0
            else Decimal('0.00')
        ).quantize(Decimal('0.01'))
        rs_pct = (Decimal('100') - effective_commission_percentage).quantize(Decimal('0.01'))

        supplier_share = supplier_share.quantize(Decimal('0.01'))
        rs_commission_share = (total_revenue - supplier_share).quantize(Decimal('0.01'))
        total_revenue = total_revenue.quantize(Decimal('0.01'))

        logo_path = settings.PDF_LOGO_PATH
        with open(logo_path, 'rb') as f:
            ext = 'jpeg' if logo_path.lower().endswith('.jpg') else 'png'
            logo_b64 = f'data:image/{ext};base64,' + base64.b64encode(f.read()).decode()

        month_name = start_date.strftime('%B')
        period_str = f"01 {month_name} - {last_day} {month_name}"

        if month == 12:
            inv_date = date(year + 1, 1, 1)
        else:
            inv_date = date(year, month + 1, 1)
        invoice_date_str = f"{inv_date.day} {inv_date.strftime('%B %Y')}"

        def fmt(val):
            return f"{float(val):,.2f}"

        def fmt_pct(val):
            v = float(val)
            return str(int(v)) if v == int(v) else str(v)

        context = {
            'invoice_number': invoice_obj.invoice_number,
            'invoice_date': invoice_date_str,
            'supplier': supplier,
            'period_str': period_str,
            'total_bookings': bookings.count(),
            'total_revenue': fmt(total_revenue),
            'rs_share': fmt(rs_commission_share),
            'rs_commission_share': fmt(rs_commission_share),
            'supplier_share': fmt(supplier_share),
            'commission_pct': fmt_pct(effective_commission_percentage),
            'rs_commission_pct': fmt_pct(rs_pct),
            'completed_count': completed_count,
            'started_count': started_count,
            'cancelled_count': cancelled_count,
            'no_show_count': no_show_count,
            'logo_data': logo_b64,
        }

        html = render_to_string('finance/supplier_invoice.html', context)
        pdf_bytes = weasyprint.HTML(string=html).write_pdf()

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{invoice_obj.invoice_number}.pdf"'
        return response

    @staticmethod
    def _next_invoice_number(supplier):
        count = SupplierInvoice.objects.filter(supplier=supplier).count() + 1
        return f"RS-{supplier.booking_id_prefix}-{str(count).zfill(4)}"
