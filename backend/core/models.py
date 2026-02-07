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
        help_text="Comma-separated list of manager emails to notify for RS Express bookings"
    )
    dublin_manager_emails = models.TextField(
        blank=True,
        help_text="Comma-separated list of manager emails to notify for Dublin Airport Parking bookings"
    )
    promotional_email_content = models.TextField(
        blank=True,
        help_text="Content for promotional emails sent to users"
    )
    pending_bookings_email_content = models.TextField(
        blank=True,
        help_text="Content for promotional emails sent to users with pending bookings"
    )
    dublin_promotional_email_content = models.TextField(
        blank=True,
        help_text="Content for promotional emails sent to Dublin Airport Parking users"
    )
    dublin_pending_bookings_email_content = models.TextField(
        blank=True,
        help_text="Content for promotional emails sent to Dublin Airport Parking users with pending bookings"
    )
    social_media_email_content = models.TextField(
        blank=True,
        help_text="Content for monthly social media follow emails (RS Express only)"
    )

    class Meta:
        db_table = 'booking_settings'
        verbose_name = 'Booking Settings'
        verbose_name_plural = 'Booking Settings'

    def __str__(self):
        return f"Settings (min_hours={self.min_hours_before_booking})"

    def get_manager_email_list(self, website=None):
        if website and website.lower() == "dublinairportparking":
            emails = self.dublin_manager_emails
            default = ["Dublinairportxpressparking@gmail.com"]
        else:
            emails = self.manager_emails
            default = ["rsexpressparking@gmail.com"]
        if not emails:
            return default
        return [email.strip() for email in emails.split(",") if email.strip()]

class OrderLimit(models.Model):
    date = models.DateField()
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='order_limits')
    max_orders = models.IntegerField(null=True, blank=True, help_text="Max orders for this date/service. Null or -1 means unlimited.")

    class Meta:
        db_table = 'order_limit'
        unique_together = ('date', 'service')

    def __str__(self):
        return f"{self.date} - {self.service.name}: {self.max_orders if self.max_orders is not None else 'Unlimited'}"


class UnsubscribedEmail(models.Model):
    email = models.EmailField(unique=True)
    unsubscribed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'unsubscribed_email'

    def __str__(self):
        return self.email
    
class MarketingLead(models.Model):
    email = models.EmailField(unique=True)
    discount_code = models.CharField(max_length=30, blank=True)
    subscribed = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'marketing_lead'

    def __str__(self):
        return f"{self.email} ({'subscribed' if self.subscribed else 'unsubscribed'})"