from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from bookings.models import Booking
from payments.models import Payment
from .models import Expense, SupplierInvoice
from users.models import Supplier
from datetime import datetime, timedelta, time
from django.db.models import Sum
from django.utils.dateparse import parse_date
from .serializers import ExpenseSerializer
from django.shortcuts import get_object_or_404
from rest_framework import status, permissions
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

@login_required
def finance_jwt_login(request):
    user = request.user
    if not (user.is_superuser and not getattr(user, 'is_manager', False)):
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
        return user.is_authenticated and user.is_superuser and not getattr(user, 'is_manager', False)
    
def calculate_payment_earning(payment, booking_status):
    """
    Returns the earning for a single payment, considering cancellation fee.
    """
    status_name = booking_status.name.lower() if booking_status else ""
    if status_name == "cancelled":
        return Decimal('15.00')
    elif status_name in ["confirmed", "rescheduled", "completed"]:
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
    if status_name in ("completed", "cancelled"):
        return True
    return bool(booking.supplier and status_name == "started")


def should_count_supplier_commission_status(status_name):
    return status_name in ("started", "completed", "cancelled")


SUPPLIER_EARNING_STATUSES = ("Cancelled", "Started", "Completed")

class AdminFinancialOverview(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def get(self, request):
        month_str = request.query_params.get('month')
        end_month_str = request.query_params.get('end_month')
        year_str = request.query_params.get('year')
        all_time = request.query_params.get('all')
        website = request.query_params.get('website')

        if not month_str and not year_str and not all_time:
            return Response({'error': 'Month, year, or all is required.'}, status=400)

        try:
            if all_time == "true":
                first_booking = Booking.objects.order_by('created_at').first()
                last_booking = Booking.objects.order_by('-created_at').first()
                if not first_booking or not last_booking:
                    return Response({'error': 'No bookings found.'}, status=404)
                start_date = first_booking.created_at.date()
                end_date = last_booking.created_at.date()
                period_label = "All Time"
            elif year_str:
                year = int(year_str)
                start_date = datetime(year, 1, 1).date()
                end_date = datetime(year, 12, 31).date()
                period_label = str(year)
            elif month_str and end_month_str:
                start_date = parse_date(f"{month_str}-01")
                end_date = parse_date(f"{end_month_str}-01")
                if not start_date or not end_date:
                    return Response({'error': 'Invalid month format.'}, status=400)
                # Set end_date to last day of end_month
                if end_date.month == 12:
                    end_date = end_date.replace(year=end_date.year+1, month=1, day=1) - timedelta(days=1)
                else:
                    end_date = end_date.replace(month=end_date.month+1, day=1) - timedelta(days=1)
                period_label = f"{month_str} to {end_month_str}"
            else:
                start_date = parse_date(f"{month_str}-01")
                if not start_date:
                    return Response({'error': 'Invalid month format.'}, status=400)
                if start_date.month == 12:
                    end_date = start_date.replace(year=start_date.year+1, month=1, day=1) - timedelta(days=1)
                else:
                    end_date = start_date.replace(month=start_date.month+1, day=1) - timedelta(days=1)
                period_label = month_str

            start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
            end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))

            # Get all relevant bookings in this period
            bookings_in_period = Booking.objects.filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime
            ).exclude(
                status__name__in=["Pending", "Payment Failed"]
            ).select_related('service', 'status', 'supplier').prefetch_related('add_ons')

            if website and website.lower() != "all":
                bookings_in_period = bookings_in_period.filter(website__iexact=website)

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
                    "completed_orders": service_bookings.exclude(
                status__name__in=["Pending", "Payment Failed"]
                    ).count(),
                    "cancelled_orders": cancelled_orders,
                    "completed_earning": float(completed_earning),
                    "cancelled_earning": float(cancelled_earning),
                })

            # Addon earning details (optional: you may want to update this logic as well)
            # Addon earning details
            addon_details = []
            for addon in AddOn.objects.all():
                addon_bookings = bookings_in_period.filter(add_ons=addon)
                completed_orders = addon_bookings.filter(status__name__in=["Completed", "Confirmed", "Rescheduled", "Started"]).count()
                cancelled_orders = addon_bookings.filter(status__name="Cancelled").count()
                # Addon revenue from supplier bookings goes straight to third party — exclude from our earnings
                completed_earning = Decimal('0.00')
                for b in addon_bookings.filter(status__name__in=["Completed", "Confirmed", "Rescheduled", "Started"]):
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

            return Response({
                'period': period_label,
                'balance': float(total_balance),
                'earnings': float(total_earnings),
                'expenses': float(total_expenses),
                'profit_or_loss': float(profit),
                'details': {
                    'fixed_expenses': [{ 'id': e.id, 'name': e.name, 'amount': float(e.amount) } for e in fixed_expenses],
                    'recurring_expenses': [{ 'id': e.id, 'name': e.name, 'amount': float(e.amount), 'months_counted': count_overlapping_months(start_date, end_date, e.recurring_start_month or start_date, e.recurring_end_month or end_date), 'total': float(e.amount) * count_overlapping_months(start_date, end_date, e.recurring_start_month or start_date, e.recurring_end_month or end_date)} for e in recurring_expenses],
                    'service_details': service_details,
                    'addon_details': addon_details,
                    'all_addons_total': float(all_addons_total),
                },
                'supplier_summary': self._build_supplier_summary(supplier_summary_bookings),
            })

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
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Get all statuses
        statuses = Status.objects.filter(type='booking')
        summary = {}
        for status in statuses:
            count = Booking.objects.filter(status=status).count()
            summary[status.name] = count
        return Response(summary)
    
class OrdersCountByServiceAndAddOnView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Count bookings for each service
        service_counts = []
        for service in Service.objects.all():
            count = Booking.objects.filter(service=service).count()
            service_counts.append({
                "service_id": service.id,
                "service_name": service.name,
                "orders_count": count
            })

        # Count bookings for each add-on
        addon_counts = []
        for addon in AddOn.objects.all():
            count = Booking.objects.filter(add_ons=addon).count()
            addon_counts.append({
                "addon_id": addon.id,
                "addon_name": addon.name,
                "orders_count": count
            })

        return Response({
            "services": service_counts,
            "addons": addon_counts
        })
    

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
        # Last 30 days
        today = timezone.localdate()
        data = []
        for i in range(29, -1, -1):
            day = today - timedelta(days=i)
            start_dt = timezone.make_aware(datetime.combine(day, time.min))
            end_dt = timezone.make_aware(datetime.combine(day + timedelta(days=1), time.min))
            count = Booking.objects.exclude(
                status__name__in=["Payment Failed", "Pending"]
            ).filter(
                created_at__gte=start_dt,
                created_at__lt=end_dt
            ).count()
            data.append({
                "date": day.strftime("%Y-%m-%d"),
                "bookings": count
            })
        return Response(data)

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

        month_str = request.query_params.get('month')
        end_month_str = request.query_params.get('end_month')
        year_str = request.query_params.get('year')
        all_time = request.query_params.get('all')

        try:
            if all_time == "true":
                first_booking = Booking.objects.filter(supplier=supplier).order_by('created_at').first()
                last_booking = Booking.objects.filter(supplier=supplier).order_by('-created_at').first()
                if not first_booking or not last_booking:
                    return Response({'error': 'No bookings found for this supplier.'}, status=404)
                start_date = first_booking.created_at.date()
                end_date = last_booking.created_at.date()
            elif year_str:
                year = int(year_str)
                start_date = datetime(year, 1, 1).date()
                end_date = datetime(year, 12, 31).date()
            elif month_str and end_month_str:
                start_date = parse_date(f"{month_str}-01")
                end_date = parse_date(f"{end_month_str}-01")
                if not start_date or not end_date:
                    return Response({'error': 'Invalid month format.'}, status=400)
                if end_date.month == 12:
                    end_date = end_date.replace(year=end_date.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    end_date = end_date.replace(month=end_date.month + 1, day=1) - timedelta(days=1)
            elif month_str:
                start_date = parse_date(f"{month_str}-01")
                if not start_date:
                    return Response({'error': 'Invalid month format.'}, status=400)
                if start_date.month == 12:
                    end_date = start_date.replace(year=start_date.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    end_date = start_date.replace(month=start_date.month + 1, day=1) - timedelta(days=1)
            else:
                return Response({'error': 'Month, year, or all parameter is required.'}, status=400)

            start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
            end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))

            bookings = Booking.objects.filter(
                supplier=supplier,
                status__name__in=SUPPLIER_EARNING_STATUSES,
            )
            if all_time != "true":
                bookings = bookings.filter(
                    departure_time__gte=start_datetime,
                    departure_time__lte=end_datetime,
                )
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
        total_extended_amount = Decimal('0.00')
        completed_count = 0
        started_count = 0
        cancelled_count = 0
        for b in bookings:
            status_name = b.status.name.lower() if b.status else ''
            if should_count_supplier_commission_status(status_name):
                total_revenue += get_booking_supplier_split_base_amount(b)
                supplier_share += get_booking_supplier_share_amount(b)
                total_extended_amount += get_supplier_extension_amount(b)

            if status_name == 'completed':
                completed_count += 1
            elif status_name == 'started':
                started_count += 1
            elif status_name == 'cancelled':
                cancelled_count += 1

        effective_commission_percentage = (
            (supplier_share / total_revenue) * Decimal('100')
            if total_revenue > 0
            else Decimal('0.00')
        ).quantize(Decimal('0.01'))
        rs_pct = (Decimal('100') - effective_commission_percentage).quantize(Decimal('0.01'))

        supplier_share = supplier_share.quantize(Decimal('0.01'))
        total_extended_amount = total_extended_amount.quantize(Decimal('0.01'))
        rs_commission_share = (total_revenue - supplier_share).quantize(Decimal('0.01'))
        rs_share = (rs_commission_share + total_extended_amount).quantize(Decimal('0.01'))
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
            'rs_share': fmt(rs_share),
            'rs_commission_share': fmt(rs_commission_share),
            'supplier_share': fmt(supplier_share),
            'total_extended_amount': fmt(total_extended_amount),
            'commission_pct': fmt_pct(effective_commission_percentage),
            'rs_commission_pct': fmt_pct(rs_pct),
            'completed_count': completed_count,
            'started_count': started_count,
            'cancelled_count': cancelled_count,
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
