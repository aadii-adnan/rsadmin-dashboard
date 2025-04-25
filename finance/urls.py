from django.urls import path
from .views import AdminFinancialOverview, AddExpenseView, UpdateExpenseView, DeleteExpenseView

urlpatterns = [
    path('overview/', AdminFinancialOverview.as_view(), name='finance-overview'),
    path('add-expense/', AddExpenseView.as_view(), name='add-expense'),
    path('expense/<int:pk>/update/', UpdateExpenseView.as_view(), name='update-expense'),
    path('expense/<int:pk>/delete/', DeleteExpenseView.as_view(), name='delete-expense'),
]
