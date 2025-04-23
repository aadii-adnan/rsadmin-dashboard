from django.urls import path
from .views import PaymentList

urlpatterns = [
    path('', PaymentList.as_view(), name='payment-list'),
]
