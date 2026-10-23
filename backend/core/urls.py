from .views import StatusListView, BookingSettingsView, OrdersCountView, OrderLimitView, DiscountSignupView
from .staff_views import StaffBookingSettingsView, StaffStatusDetailView, StaffStatusesView
from .staff_marketing_views import StaffMarketingLeadsView, StaffUnsubscribesView
from django.urls import path

urlpatterns = [
    path('statuses/', StatusListView.as_view(), name='status-list'),
    path('booking-settings/', BookingSettingsView.as_view(), name='booking-settings'),
    path('orders-count/', OrdersCountView.as_view(), name='orders-count'),
    path('order-limit/', OrderLimitView.as_view(), name='order-limit'),
    path('discount-signup/', DiscountSignupView.as_view(), name='discount-signup'),
    path('staff/statuses/', StaffStatusesView.as_view(), name='staff-statuses'),
    path('staff/statuses/<int:status_id>/', StaffStatusDetailView.as_view(), name='staff-status-detail'),
    path('staff/booking-settings/', StaffBookingSettingsView.as_view(), name='staff-booking-settings'),
    path('staff/marketing-leads/', StaffMarketingLeadsView.as_view(), name='staff-marketing-leads'),
    path('staff/unsubscribes/', StaffUnsubscribesView.as_view(), name='staff-unsubscribes'),
]
