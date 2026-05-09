from django.db import models


class Expense(models.Model):
    WEBSITE_CHOICES = [
        ("rsexpressparking", "RS Express Parking"),
        ("dublinairportparking", "Dublin Airport Parking"),
        ("both", "Both"),
    ]
    name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    recurring = models.BooleanField(default=False)  # Monthly recurring
    for_month = models.DateField(help_text="The month this applies to (YYYY-MM-01 format)", blank=True, null=True)
    recurring_start_month = models.DateField(blank=True, null=True, help_text="Recurring start month (YYYY-MM-01)")
    recurring_end_month = models.DateField(blank=True, null=True, help_text="Recurring end month (YYYY-MM-01)")
    website = models.CharField(max_length=32, choices=WEBSITE_CHOICES, default="rsexpressparking")  # <-- NEW FIELD
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'expense'


class SupplierInvoice(models.Model):
    supplier = models.ForeignKey(
        'users.Supplier', on_delete=models.CASCADE, related_name='invoices'
    )
    invoice_number = models.CharField(max_length=30, unique=True)
    period_month = models.IntegerField()
    period_year = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'supplier_invoice'
        unique_together = ('supplier', 'period_month', 'period_year')