from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from users.models import CustomUser, Supplier
from services.models import Service, AddOn, Coupon
from core.models import Status
import uuid
from django.utils import timezone

class Booking(models.Model):
    booking_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
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
    previous_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)
    discounted_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.ForeignKey(Status, on_delete=models.SET_NULL, null=True, limit_choices_to={'type': 'booking'})
    discount_coupon_awarded = models.CharField(max_length=50, blank=True, null=True)
    bonus_points_used = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    email_sent = models.BooleanField(default=False)
    completion_email_sent = models.BooleanField(default=False)
    completion_email_task_id = models.CharField(max_length=255, null=True, blank=True)
    started_status_task_id = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(null=True, blank=True)
    modified_at = models.DateTimeField(auto_now=True)
    note = models.TextField(blank=True, null=True)
    is_viewed = models.BooleanField(default=False)
    website = models.CharField(
        max_length=50,
        default="rsexpressparking",
        help_text="Source website for this booking"
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='bookings',
        help_text="If set, this booking was created by a vendor/supplier"
    )
    supplier_commission_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        editable=False,
        help_text="Commission percentage snapshot saved at booking time for supplier payouts.",
    )
    supplier_extended_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text="Admin-only extra amount for supplier bookings. This amount goes fully to RS.",
    )

    @staticmethod
    def _generate_unique_booking_id(prefix):
        booking_id = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"
        while Booking.objects.filter(booking_id=booking_id).exists():
            booking_id = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"
        return booking_id

    def clean(self):
        if self.supplier and self.supplier.use_custom_booking_ids and not self.booking_id:
            raise ValidationError({'booking_id': 'Custom booking ID is required for this supplier.'})

    def save(self, *args, **kwargs):
        if not self.pk:
            if self.supplier:
                if self.supplier.use_custom_booking_ids:
                    if not self.booking_id:
                        raise ValidationError({'booking_id': 'Custom booking ID is required for this supplier.'})
                else:
                    self.booking_id = self._generate_unique_booking_id(self.supplier.booking_id_prefix)
            elif not self.booking_id:
                prefix = "DA" if self.website.lower() == "dublinairportparking" else "RS"
                self.booking_id = self._generate_unique_booking_id(prefix)

        if self.supplier and self.supplier_commission_percentage is None:
            self.supplier_commission_percentage = self.supplier.commission_percentage
            if kwargs.get("update_fields") is not None:
                update_fields = set(kwargs["update_fields"])
                update_fields.add("supplier_commission_percentage")
                kwargs["update_fields"] = list(update_fields)
        
        # Set created_at for new bookings if not provided
        if not self.pk and not self.created_at:
            self.created_at = timezone.now()
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id} {self.first_name} {self.last_name} - {self.service.name} - {self.departure_time.date()}"
    
    class Meta:
        db_table = 'bookings'

class BookingUser(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField()
    contact_no = models.CharField(max_length=20, blank=True, null=True)
    booking_completion_status = models.BooleanField(default=False)  # False = not completed, True = completed
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name or ''} - {self.email}"
