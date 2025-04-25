from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from bookings.models import Booking
from payments.models import Payment
from .models import Expense
from datetime import datetime, timedelta
from django.db.models import Sum
from django.utils.dateparse import parse_date
from .serializers import ExpenseSerializer
from django.shortcuts import get_object_or_404

class AdminFinancialOverview(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        month_str = request.query_params.get('month')  # format: '2025-04'
        if not month_str:
            return Response({'error': 'Month is required. Format: YYYY-MM'}, status=400)

        try:
            start_date = parse_date(f"{month_str}-01")
            end_month = start_date.replace(day=28) + timedelta(days=4)
            end_date = end_month - timedelta(days=end_month.day)

            # Total earnings from completed bookings with successful payments
            earnings = Payment.objects.filter(
                booking__status__name='Completed',
                status__name='succeeded',
                created_at__range=(start_date, end_date)
            ).aggregate(total=Sum('amount'))['total'] or 0

            # Expenses for this month
            fixed_expenses = Expense.objects.filter(for_month__year=start_date.year, for_month__month=start_date.month)
            recurring_expenses = Expense.objects.filter(recurring=True)

            total_expenses = sum(e.amount for e in fixed_expenses) + sum(e.amount for e in recurring_expenses)
            profit = earnings - total_expenses

            return Response({
                'month': month_str,
                'earnings': float(earnings),
                'expenses': float(total_expenses),
                'profit_or_loss': float(profit),
                'details': {
                    'fixed_expenses': [{ 'name': e.name, 'amount': float(e.amount) } for e in fixed_expenses],
                    'recurring_expenses': [{ 'name': e.name, 'amount': float(e.amount) } for e in recurring_expenses],
                }
            })

        except Exception as e:
            return Response({'error': str(e)}, status=500)
        

class AddExpenseView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = ExpenseSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Expense added successfully'})
        return Response(serializer.errors, status=400)       

class UpdateExpenseView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        expense = get_object_or_404(Expense, id=pk)
        serializer = ExpenseSerializer(expense, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Expense updated successfully.'})
        return Response(serializer.errors, status=400)

class DeleteExpenseView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        expense = get_object_or_404(Expense, id=pk)
        expense.delete()
        return Response({'message': 'Expense deleted successfully.'})
