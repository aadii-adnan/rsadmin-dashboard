from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_manager = models.BooleanField(default=False)  # for RBAC
    is_supplier = models.BooleanField(default=False)  # for supplier/vendor RBAC
    bonus_points = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # for bonus system

    class Meta:
        db_table = 'user'


class Supplier(models.Model):
    name = models.CharField(max_length=200, help_text="Vendor business name")
    contact_person = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, null=True)
    booking_id_prefix = models.CharField(
        max_length=10, unique=True,
        help_text="Prefix used for booking IDs of this vendor's bookings (e.g., 'VN')"
    )
    commission_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=30.00,
        help_text="Percentage the supplier earns (we keep the rest)"
    )
    user = models.OneToOneField(
        CustomUser, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='supplier_profile',
        help_text="Auto-created user account for this vendor"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'supplier'

    def __str__(self):
        return f"{self.name} ({self.booking_id_prefix})"