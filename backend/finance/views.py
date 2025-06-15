from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from bookings.models import Booking
from payments.models import Payment
from .models import Expense
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
from django.http import HttpResponseRedirect
from django.contrib.auth.decorators import login_required

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

class AdminFinancialOverview(APIView):
    permission_classes = [IsSuperAdminNotManager]

    def get(self, request):
        month_str = request.query_params.get('month')  # format: '2025-04'
        if not month_str:
            return Response({'error': 'Month is required. Format: YYYY-MM'}, status=400)

        try:
            # Calculate start and end of the month
            start_date = parse_date(f"{month_str}-01")
            if not start_date:
                return Response({'error': 'Invalid month format.'}, status=400)
            # Get the first day of the next month, then subtract one day for end_date
            if start_date.month == 12:
                end_date = start_date.replace(year=start_date.year+1, month=1, day=1) - timedelta(days=1)
            else:
                end_date = start_date.replace(month=start_date.month+1, day=1) - timedelta(days=1)

            start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
            end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))        

            # Get all payments in this month
            payments_in_month = Payment.objects.filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime,
                status__name="Succeeded"
            ).select_related('booking', 'booking__service', 'booking__status').prefetch_related('booking__add_ons')

            # Calculate total earnings
            total_earnings = Decimal('0.00')
            for payment in payments_in_month:
                total_earnings += calculate_payment_earning(payment, payment.booking.status)

            # Expenses for this month
            fixed_expenses = Expense.objects.filter(for_month__year=start_date.year, for_month__month=start_date.month)
            recurring_expenses = Expense.objects.filter(recurring=True)
            total_expenses = sum(e.amount for e in fixed_expenses) + sum(e.amount for e in recurring_expenses)
            profit = total_earnings - total_expenses

            # Service earning details
            service_details = []
            for service in Service.objects.all():
                service_payments = payments_in_month.filter(booking__service=service)
                completed_orders = service_payments.filter(booking__status__name__in=["Completed", "Confirmed", "Rescheduled"]).count()
                cancelled_orders = service_payments.filter(booking__status__name="Cancelled").count()
                completed_earning = sum(
                    calculate_payment_earning(p, p.booking.status)
                    for p in service_payments.filter(booking__status__name__in=["Completed", "Confirmed", "Rescheduled"])
                )
                cancelled_earning = sum(
                    calculate_payment_earning(p, p.booking.status)
                    for p in service_payments.filter(booking__status__name="Cancelled")
                )
                service_details.append({
                    "service_id": service.id,
                    "service_name": service.name,
                    "completed_orders": completed_orders,
                    "cancelled_orders": cancelled_orders,
                    "completed_earning": float(completed_earning),
                    "cancelled_earning": float(cancelled_earning),
                })

            # Addon earning details
            addon_details = []
            for addon in AddOn.objects.all():
                addon_payments = payments_in_month.filter(booking__add_ons=addon)
                completed_orders = addon_payments.filter(booking__status__name__in=["Completed", "Confirmed", "Rescheduled"]).count()
                cancelled_orders = addon_payments.filter(booking__status__name="Cancelled").count()
                completed_earning = sum(
                    calculate_payment_earning(p, p.booking.status)
                    for p in addon_payments.filter(booking__status__name__in=["Completed", "Confirmed", "Rescheduled"])
                )
                cancelled_earning = sum(
                    calculate_payment_earning(p, p.booking.status)
                    for p in addon_payments.filter(booking__status__name="Cancelled")
                )
                addon_details.append({
                    "addon_id": addon.id,
                    "addon_name": addon.name,
                    "completed_orders": completed_orders,
                    "cancelled_orders": cancelled_orders,
                    "completed_earning": float(completed_earning),
                    "cancelled_earning": float(cancelled_earning),
                })

            return Response({
                'month': month_str,
                'earnings': float(total_earnings),
                'expenses': float(total_expenses),
                'profit_or_loss': float(profit),
                'details': {
                    'fixed_expenses': [{ 'id': e.id, 'name': e.name, 'amount': float(e.amount) } for e in fixed_expenses],
                    'recurring_expenses': [{ 'id': e.id, 'name': e.name, 'amount': float(e.amount) } for e in recurring_expenses],
                    'service_details': service_details,
                    'addon_details': addon_details,
                }
            })

        except Exception as e:
            return Response({'error': str(e)}, status=500)
        

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
            payments = Payment.objects.filter(
                created_at__gte=start_dt,
                created_at__lte=end_dt,
                status__name="Succeeded"
            )
            earning = sum(p.amount for p in payments)
            data.append({
                "month": start.strftime("%Y-%m"),
                "earning": float(earning)
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