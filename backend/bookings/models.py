from django.db import models
from users.models import CustomUser
from services.models import Service, AddOn, Coupon
from core.models import Status
import uuid

class Booking(models.Model):
    booking_id = models.CharField(max_length=20, unique=True, editable=False, blank=True, null=True)
    user = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    add_ons = models.ManyToManyField(AddOn, blank=True)

    # Car details
    car_registration_no = models.CharField(max_length=50)
    car_model = models.CharField(max_length=100)
    car_colour = models.CharField(max_length=50)
    car_manufacturer = models.CharField(max_length=100)

    # Terminal and Flight info
    departure_terminal = models.CharField(max_length=50)
    return_terminal = models.CharField(max_length=50)
    departure_flight_number = models.CharField(max_length=50, blank=True, null=True)
    return_flight_number = models.CharField(max_length=50, blank=True, null=True)

    # Personal info
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    contact_no = models.CharField(max_length=20, blank=True, null=True)
    total_passengers = models.PositiveIntegerField(blank=True, null=True)

    # Timing and status
    departure_time = models.DateTimeField()
    return_time = models.DateTimeField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)
    discounted_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.ForeignKey(Status, on_delete=models.SET_NULL, null=True, limit_choices_to={'type': 'booking'})
    discount_coupon_awarded = models.CharField(max_length=50, blank=True, null=True)
    email_sent = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.booking_id:
            # Generate a unique ID, e.g., RS-1A2B3C4D
            self.booking_id = f"RS-{uuid.uuid4().hex[:8].upper()}"
            while Booking.objects.filter(booking_id=self.booking_id).exists():
                self.booking_id = f"RS-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id} {self.first_name} {self.last_name} - {self.service.name} - {self.departure_time.date()}"
    
    class Meta:
        db_table = 'bookings'
