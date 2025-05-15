from django.db import models

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
