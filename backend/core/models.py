from django.db import models
from services.models import Service

class Status(models.Model):
    STATUS_TYPE_CHOICES = (
        ('booking', 'Booking'),
        ('payment', 'Payment'),
    )

    name = models.CharField(max_length=30)
    type = models.CharField(max_length=20, choices=STATUS_TYPE_CHOICES)

    class Meta:
        unique_together = ('name', 'type')
        db_table = 'status'

    def __str__(self):
        return self.name

class BookingSettings(models.Model):
    min_hours_before_booking = models.PositiveIntegerField(default=4, help_text="Minimum hours before drop-off allowed for booking")
    manager_emails = models.TextField(
        blank=True,
        help_text="Comma-separated list of manager emails to notify for bookings"
    )

    class Meta:
        db_table = 'booking_settings'
        verbose_name = 'Booking Settings'
        verbose_name_plural = 'Booking Settings'

    def __str__(self):
        return f"Settings (min_hours={self.min_hours_before_booking})"

    def get_manager_email_list(self):
        if not self.manager_emails:
            return []
        return [email.strip() for email in self.manager_emails.split(",") if email.strip()]

class OrderLimit(models.Model):
    date = models.DateField()
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='order_limits')
    max_orders = models.IntegerField(null=True, blank=True, help_text="Max orders for this date/service. Null or -1 means unlimited.")

    class Meta:
        db_table = 'order_limit'
        unique_together = ('date', 'service')

    def __str__(self):
        return f"{self.date} - {self.service.name}: {self.max_orders if self.max_orders is not None else 'Unlimited'}"
