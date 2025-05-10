from django.urls import path
from .views import PaymentList, CreateStripePaymentIntent, StripeWebhookView, InvoiceDownloadView, BookingFormDownloadView, PaymentStatusView, VerifyBookingAmountView, UpdatePaymentStatusView

urlpatterns = [
    path('', PaymentList.as_view(), name='payment-list'),
    path('create-intent/<int:booking_id>/', CreateStripePaymentIntent.as_view(), name='create-payment-intent'),
    path('webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('invoice/<int:booking_id>/', InvoiceDownloadView.as_view(), name='invoice-download'),
    path('booking-form/<int:booking_id>/', BookingFormDownloadView.as_view(), name='booking-form-download'),
    path('status/<int:booking_id>/', PaymentStatusView.as_view(), name='payment-status'),
    path('verify-amount/<int:booking_id>/', VerifyBookingAmountView.as_view(), name='verify-booking-amount'),
    path('update-status/<int:payment_id>/', UpdatePaymentStatusView.as_view(), name='update-payment-status'),
]
