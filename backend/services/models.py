from django.db import models
from django.utils.text import slugify
from django.utils import timezone

class Service(models.Model):
    WEBSITE_CHOICES = [
        ("both", "Both"),
        ("rsexpressparking", "RS Express Parking"),
        ("dublinairportparking", "Dublin Airport Parking"),
        ("none", "None"),
    ]
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField()
    long_description = models.TextField()
    is_featured = models.BooleanField(default=False)
    base_price = models.DecimalField(max_digits=8, decimal_places=2)
    per_day_price = models.DecimalField(max_digits=8, decimal_places=2)
    image = models.ImageField(upload_to='service_images/', blank=True, null=True)
    order = models.PositiveIntegerField(default=1, help_text="Lower numbers appear first in the list")
    enabled = models.BooleanField(default=True, help_text="Uncheck to disable this service")
    website = models.CharField(
        max_length=32,
        choices=WEBSITE_CHOICES,
        default="both",
        help_text="Which website(s) this service should appear on"
    )  # <-- NEW FIELD

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
        db_table = 'services'
        ordering = ['order', 'id']


class AddOn(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    description = models.TextField(blank=True)
    active = models.BooleanField(default=True, help_text="Uncheck to disable this add-on")

    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'addons'


class Coupon(models.Model):
    code = models.CharField(max_length=20, unique=True)
    discount_percent = models.PositiveIntegerField(help_text="Enter a value between 1 and 100")
    active = models.BooleanField(default=True)
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField(null=True, blank=True, help_text="Leave blank if lifetime")
    lifetime = models.BooleanField(default=False, help_text="If checked, coupon never expires by date")
    max_uses = models.PositiveIntegerField(default=1, help_text="Maximum number of times this coupon can be used")
    times_used = models.PositiveIntegerField(default=0, help_text="Number of times this coupon has been used")
    minimum_order_value = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        help_text="Minimum order total required to use this coupon. Set to 0 for no minimum."
    )

    class Meta:
        db_table = 'coupon'

    def __str__(self):
        scope = "lifetime" if self.lifetime else f"until {self.valid_to.strftime('%Y-%m-%d')}" if self.valid_to else "dated"
        return f"{self.code} - {self.discount_percent}% ({scope})"

    def is_valid(self):
        now = timezone.now()
        if not self.active:
            return False
        if self.times_used >= self.max_uses:
            return False
        if self.lifetime:
            return True
        if self.valid_to is None:
            return self.valid_from <= now  # open-ended if no valid_to but not marked lifetime
        return self.valid_from <= now <= self.valid_to

