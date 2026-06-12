from django.urls import path
from .views import BookingListCreate, BookingRescheduleView, CancelBookingView, ManagerBookingList, ManagerBookingStatusUpdate, BookingDetailView, UserBookingsView, BookingUserCreateView, BookingUserStatusUpdateView
from .guest_views import (
    ManageBookingLinkRequestView,
    ManageBookingDetailView,
    ManageBookingRescheduleView,
    ManageBookingCancelView,
)

urlpatterns = [
    path('', BookingListCreate.as_view(), name='booking-list-create'),
    path('manage/request-link/', ManageBookingLinkRequestView.as_view(), name='manage-booking-request-link'),
    path('manage/booking/', ManageBookingDetailView.as_view(), name='manage-booking-detail'),
    path('manage/reschedule/', ManageBookingRescheduleView.as_view(), name='manage-booking-reschedule'),
    path('manage/cancel/', ManageBookingCancelView.as_view(), name='manage-booking-cancel'),
    path('<int:pk>/reschedule/', BookingRescheduleView.as_view(), name='booking-reschedule'),
    path('<int:pk>/cancel/', CancelBookingView.as_view(), name='booking-cancel'),
    path('manager/all/', ManagerBookingList.as_view(), name='manager-booking-list'),
    path('manager/<int:pk>/status/', ManagerBookingStatusUpdate.as_view(), name='manager-booking-status'),
    path('<int:pk>/', BookingDetailView.as_view(), name='booking-detail'),
    path('user/<int:user_id>/', UserBookingsView.as_view(), name='user-bookings'),
    path('booking-user/', BookingUserCreateView.as_view(), name='booking-user-create'),
    path('booking-user/<int:pk>/status/', BookingUserStatusUpdateView.as_view(), name='booking-user-status-update'),
]
