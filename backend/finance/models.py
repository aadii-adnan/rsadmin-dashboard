from django.db import models

# Create your models here.

class Expense(models.Model):
    name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    recurring = models.BooleanField(default=False)  # Monthly recurring
    for_month = models.DateField(help_text="The month this applies to (YYYY-MM-01 format)", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'expense'
