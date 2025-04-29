from django.urls import path
from .views import BookingListCreate, BookingRescheduleView, CancelBookingView, ManagerBookingList, ManagerBookingStatusUpdate

urlpatterns = [
    path('', BookingListCreate.as_view(), name='booking-list-create'),
    path('<int:pk>/reschedule/', BookingRescheduleView.as_view(), name='booking-reschedule'),
    path('<int:pk>/cancel/', CancelBookingView.as_view(), name='booking-cancel'),
    path('manager/all/', ManagerBookingList.as_view(), name='manager-booking-list'),
    path('manager/<int:pk>/status/', ManagerBookingStatusUpdate.as_view(), name='manager-booking-status'),
]
