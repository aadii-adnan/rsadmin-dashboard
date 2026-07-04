from django.conf import settings
from django.db import models
from bookings.models import Booking
from core.models import Status

class Payment(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments')
    stripe_payment_intent = models.CharField(max_length=255)
    stripe_customer_id = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.ForeignKey(Status, on_delete=models.SET_NULL, null=True, limit_choices_to={'type': 'payment'})
    status_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment for {self.booking} - {self.status}"

    class Meta:
        db_table = 'payments'


class CreditTransaction(models.Model):
    """Ledger of every credit-balance change. `user.bonus_points` is the
    cached balance; this table is the audit trail. Top-ups start as
    `pending` rows and are materialized by the Stripe webhook — the unique
    `stripe_payment_intent` column doubles as the idempotency guard."""

    TYPE_TOPUP = 'topup'
    TYPE_BOOKING_SPEND = 'booking_spend'
    TYPE_CANCELLATION_REFUND = 'cancellation_refund'
    TYPE_ADJUSTMENT = 'adjustment'
    TYPE_CHOICES = [
        (TYPE_TOPUP, 'Top-up'),
        (TYPE_BOOKING_SPEND, 'Booking spend'),
        (TYPE_CANCELLATION_REFUND, 'Cancellation refund'),
        (TYPE_ADJUSTMENT, 'Adjustment'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_SUCCEEDED = 'succeeded'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_SUCCEEDED, 'Succeeded'),
        (STATUS_FAILED, 'Failed'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='credit_transactions',
    )
    transaction_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    # Signed: positive = credit added, negative = credit spent/deducted
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    note = models.CharField(max_length=255, blank=True, default='')
    booking = models.ForeignKey(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='credit_transactions',
    )
    stripe_payment_intent = models.CharField(max_length=255, null=True, blank=True, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SUCCEEDED)
    website = models.CharField(max_length=50, default='rsexpressparking')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'credit_transactions'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', '-created_at'])]

    def __str__(self):
        return f"{self.get_transaction_type_display()} {self.amount} for {self.user} ({self.status})"