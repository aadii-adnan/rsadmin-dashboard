from django.urls import path
from .views import (
    AdminFinancialOverview, AddExpenseView, UpdateExpenseView, DeleteExpenseView,
    BookingsSummaryView, OrdersCountByServiceAndAddOnView, MonthlyEarningsTrendView,
    BookingsOverTimeView, ExpenseBreakdownView, ProfitMarginOverTimeView,
    SupplierFinanceDetailView, SupplierInvoicePDFView,
)

urlpatterns = [
    path('overview/', AdminFinancialOverview.as_view(), name='finance-overview'),
    path('add-expense/', AddExpenseView.as_view(), name='add-expense'),
    path('expense/<int:pk>/update/', UpdateExpenseView.as_view(), name='update-expense'),
    path('expense/<int:pk>/delete/', DeleteExpenseView.as_view(), name='delete-expense'),
    path('dashboard/bookings-summary/', BookingsSummaryView.as_view(), name='bookings-summary'),
    path('dashboard/orders-count/', OrdersCountByServiceAndAddOnView.as_view(), name='orders-count-by-service-addon'),
    path('charts/monthly-earnings/', MonthlyEarningsTrendView.as_view(), name='monthly-earnings'),
    path('charts/bookings-over-time/', BookingsOverTimeView.as_view(), name='bookings-over-time'),
    path('charts/expense-breakdown/', ExpenseBreakdownView.as_view(), name='expense-breakdown'),
    path('charts/profit-margin/', ProfitMarginOverTimeView.as_view(), name='profit-margin'),
    path('supplier/<int:supplier_id>/', SupplierFinanceDetailView.as_view(), name='supplier-finance-detail'),
    path('supplier/<int:supplier_id>/invoice/', SupplierInvoicePDFView.as_view(), name='supplier-invoice-pdf'),
]
