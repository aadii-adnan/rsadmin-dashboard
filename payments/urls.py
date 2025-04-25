from django.urls import path
from .views import PaymentList, CreateStripePaymentIntent, StripeWebhookView, InvoiceDownloadView

urlpatterns = [
    path('', PaymentList.as_view(), name='payment-list'),
    path('create-intent/<int:booking_id>/', CreateStripePaymentIntent.as_view(), name='create-payment-intent'),
    path('webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('invoice/<int:booking_id>/', InvoiceDownloadView.as_view(), name='invoice-download'),
]
