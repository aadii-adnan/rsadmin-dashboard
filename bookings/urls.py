from django.urls import path
from .views import BookingListCreate

urlpatterns = [
    path('', BookingListCreate.as_view(), name='booking-list-create'),
]
