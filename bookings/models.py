from django.db import models
from users.models import CustomUser
from services.models import Service, AddOn

class Booking(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
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
    surname = models.CharField(max_length=100)
    email = models.EmailField()
    contact_no = models.CharField(max_length=20)
    total_passengers = models.PositiveIntegerField(blank=True, null=True)

    # Timing and status
    departure_time = models.DateTimeField()
    return_time = models.DateTimeField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50, default='Pending')  # Confirmed, Cancelled, etc.

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.surname} - {self.service.name} - {self.dropoff_time.date()}"
    
    class Meta:
        db_table = 'Bookings'
