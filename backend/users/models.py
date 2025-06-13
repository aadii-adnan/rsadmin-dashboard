from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_manager = models.BooleanField(default=False)  # for RBAC
    bonus_points = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # for bonus system

    class Meta:
        db_table = 'user'