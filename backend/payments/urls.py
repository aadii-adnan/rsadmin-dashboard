from django.urls import path
from .views import (
    PaymentList,
    CreateStripePaymentIntent,
    StripeWebhookView,
    InvoiceDownloadView,
    BookingFormDownloadView,
    PaymentStatusView,
    VerifyBookingAmountView,
    UpdatePaymentStatusView,
    CreateCreditTopUpIntent,
    CreditTopUpStatusView,
    CreditHistoryView,
    TopUpInvoiceDownloadView,
    PayBookingWithCreditsView,
)
from .staff_views import StaffCreditLedgerView
from .staff_payment_views import StaffPaymentDetailView, StaffPaymentsView

urlpatterns = [
    path('', PaymentList.as_view(), name='payment-list'),
    path('create-intent/<int:booking_id>/', CreateStripePaymentIntent.as_view(), name='create-payment-intent'),
    path('webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('invoice/<int:booking_id>/', InvoiceDownloadView.as_view(), name='invoice-download'),
    path('booking-form/<int:booking_id>/', BookingFormDownloadView.as_view(), name='booking-form-download'),
    path('status/<int:booking_id>/', PaymentStatusView.as_view(), name='payment-status'),
    path('verify-amount/<int:booking_id>/', VerifyBookingAmountView.as_view(), name='verify-booking-amount'),
    path('update-status/<int:payment_id>/', UpdatePaymentStatusView.as_view(), name='update-payment-status'),
    path('credits/create-intent/', CreateCreditTopUpIntent.as_view(), name='credit-topup-create-intent'),
    path('credits/status/<int:transaction_id>/', CreditTopUpStatusView.as_view(), name='credit-topup-status'),
    path('credits/history/', CreditHistoryView.as_view(), name='credit-history'),
    path('credits/invoice/<int:transaction_id>/', TopUpInvoiceDownloadView.as_view(), name='credit-topup-invoice'),
    path('pay-with-credits/<int:booking_id>/', PayBookingWithCreditsView.as_view(), name='pay-with-credits'),
    path('staff/credits/', StaffCreditLedgerView.as_view(), name='staff-credit-ledger'),
    path('staff/records/', StaffPaymentsView.as_view(), name='staff-payment-records'),
    path('staff/records/<int:payment_id>/', StaffPaymentDetailView.as_view(), name='staff-payment-record-detail'),
]
