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