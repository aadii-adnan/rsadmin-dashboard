from django.db import models
from django.db.models import Q
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from users.models import CustomUser, Supplier
from services.models import Service, AddOn, Coupon
from core.models import Status
import uuid
from urllib.parse import urlparse
from django.utils import timezone

# --- Marketing attribution helpers ---------------------------------------
# Keyword lists kept as module constants so the SEO team can extend them later.
PAID_SEARCH_SOURCES = ("google", "bing")
PAID_MEDIUMS = ("cpc", "ppc", "paid", "paidsearch", "paid-search")
SOCIAL_KEYWORDS = (
    "facebook", "fb", "instagram", "ig", "twitter", "x.com", "linkedin",
    "tiktok", "youtube", "pinterest", "snapchat", "reddit", "whatsapp",
    "t.co", "lnkd.in",
)
SEARCH_ENGINE_KEYWORDS = ("google", "bing", "yahoo", "duckduckgo", "ecosia", "baidu", "yandex")


def normalize_phone_number(value):
    """Return a stable digits-only phone value for customer-history matching."""
    digits = "".join(character for character in str(value or "") if character.isdigit())
    if not digits:
        return None

    # Convert an international dialing prefix and common Irish local formats
    # to the same representation produced by the booking form (+353...).
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("3530"):
        digits = f"353{digits[4:]}"
    elif digits.startswith("0"):
        digits = f"353{digits[1:]}"

    return digits or None


def classify_source(utm_source=None, utm_medium=None, gclid=None, fbclid=None, referrer_url=None):
    """Derive a clean channel label from raw attribution data (first-touch)."""
    src = (utm_source or "").lower()
    medium = (utm_medium or "").lower()

    referrer_host = ""
    if referrer_url:
        try:
            referrer_host = (urlparse(referrer_url).hostname or "").lower()
        except (ValueError, TypeError):
            referrer_host = ""

    # Google Ads / paid search
    if gclid or (any(k in src for k in PAID_SEARCH_SOURCES) and medium in PAID_MEDIUMS):
        return "Google Ads"

    # Social media
    if fbclid or any(k in src for k in SOCIAL_KEYWORDS) or any(k in referrer_host for k in SOCIAL_KEYWORDS):
        return "Social Media"

    # Any other tagged campaign — label from medium (or source) capitalised
    if medium:
        return medium.capitalize()
    if src:
        return src.capitalize()

    # No UTM tags — fall back to referrer
    if referrer_host:
        if any(k in referrer_host for k in SEARCH_ENGINE_KEYWORDS):
            return "Organic Search"
        return "Referral"

    return "Direct"


class Booking(models.Model):
    class CustomerExperience(models.TextChoices):
        GOOD = 'good', 'Good'
        BAD = 'bad', 'Bad'

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
    contact_no_normalized = models.CharField(
        max_length=32,
        blank=True,
        null=True,
        db_index=True,
        editable=False,
    )
    total_passengers = models.PositiveIntegerField(blank=True, null=True)

    # Internal staff review used to brief drivers on returning customers.
    customer_experience = models.CharField(
        max_length=10,
        choices=CustomerExperience.choices,
        blank=True,
        null=True,
    )
    customer_experience_details = models.TextField(blank=True, null=True)

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

    # Marketing attribution (first-touch). Raw values captured from the landing URL/referrer.
    utm_source = models.CharField(max_length=255, blank=True, null=True)
    utm_medium = models.CharField(max_length=255, blank=True, null=True)
    utm_campaign = models.CharField(max_length=255, blank=True, null=True)
    utm_term = models.CharField(max_length=255, blank=True, null=True)
    utm_content = models.CharField(max_length=255, blank=True, null=True)
    gclid = models.CharField(max_length=255, blank=True, null=True, help_text="Google Ads click id")
    fbclid = models.CharField(max_length=255, blank=True, null=True, help_text="Facebook click id")
    referrer_url = models.URLField(max_length=500, blank=True, null=True)
    source_channel = models.CharField(
        max_length=30, blank=True, null=True,
        help_text="Derived marketing channel (e.g. Google Ads, Social Media, Organic Search, Referral, Direct)."
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

    def get_previous_customer_experience(self):
        """Return the latest reviewed, already-ended booking for this customer."""
        if not self.departure_time:
            return None

        identity_query = Q()
        if self.user_id:
            identity_query |= Q(user_id=self.user_id)

        email = (self.email or '').strip()
        if email:
            identity_query |= Q(email__iexact=email)

        normalized_phone = self.contact_no_normalized or normalize_phone_number(self.contact_no)
        if normalized_phone:
            identity_query |= Q(contact_no_normalized=normalized_phone)

        if not identity_query:
            return None

        return (
            Booking.objects
            .filter(
                identity_query,
                customer_experience__in=self.CustomerExperience.values,
                return_time__lt=self.departure_time,
            )
            .exclude(pk=self.pk)
            .order_by('-return_time', '-created_at', '-pk')
            .first()
        )

    def save(self, *args, **kwargs):
        self.contact_no_normalized = normalize_phone_number(self.contact_no)
        if kwargs.get("update_fields") is not None:
            update_fields = set(kwargs["update_fields"])
            if "contact_no" in update_fields:
                update_fields.add("contact_no_normalized")
                kwargs["update_fields"] = list(update_fields)

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

        # Derive marketing channel on creation if not already set
        if not self.pk and not self.source_channel:
            self.source_channel = classify_source(
                utm_source=self.utm_source,
                utm_medium=self.utm_medium,
                gclid=self.gclid,
                fbclid=self.fbclid,
                referrer_url=self.referrer_url,
            )

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
