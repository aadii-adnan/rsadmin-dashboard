from django.db import models
from django.utils.text import slugify
from users.models import CustomUser

class Service(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField()
    is_featured = models.BooleanField(default=False)
    base_price = models.DecimalField(max_digits=8, decimal_places=2)
    per_day_price = models.DecimalField(max_digits=8, decimal_places=2)

    def save(self, *args, **kwargs):    
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Service.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'Services'


class AddOn(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'AddOns'
class Coupon(models.Model):
    code = models.CharField(max_length=20, unique=True)
    discount_percent = models.PositiveIntegerField(help_text="Enter a value between 1 and 100")
    active = models.BooleanField(default=True)
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='coupons', null=True, blank=True)

    class Meta:
        db_table = 'Coupon'

    def __str__(self):
        return f"{self.code} - {self.discount_percent}%"


