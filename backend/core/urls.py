from .views import StatusListView, BookingSettingsView, OrdersCountView, OrderLimitView, DiscountSignupView
from django.urls import path

urlpatterns = [
    path('statuses/', StatusListView.as_view(), name='status-list'),
    path('booking-settings/', BookingSettingsView.as_view(), name='booking-settings'),
    path('orders-count/', OrdersCountView.as_view(), name='orders-count'),
    path('order-limit/', OrderLimitView.as_view(), name='order-limit'),
    path('discount-signup/', DiscountSignupView.as_view(), name='discount-signup'),
]
