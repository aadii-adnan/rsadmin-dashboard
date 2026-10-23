"""Shared, safe booking-change summaries for staff update notifications."""

from django.utils import timezone


UPDATE_EMAIL_FIELD_LABELS = {
    'departure_time': 'Drop-off date & time',
    'return_time': 'Pick-up date & time',
    'departure_terminal': 'Departure terminal',
    'return_terminal': 'Return terminal',
    'departure_flight_number': 'Departure flight number',
    'return_flight_number': 'Return flight number',
    'car_registration_no': 'Car registration',
    'car_model': 'Car model',
    'car_colour': 'Car colour',
    'car_manufacturer': 'Car manufacturer',
    'contact_no': 'Phone number',
    'total_passengers': 'Total passengers',
    'add_ons': 'Add-ons',
    'total_price': 'Total price',
    'discounted_price': 'Discounted price',
    'bonus_points_used': 'Bonus points used',
}

# These fields are either internal operational notes or values which must not
# be sent to customers in a generic update email.
UPDATE_EMAIL_EXCLUDED_FIELDS = {
    'note',
    'customer_experience',
    'customer_experience_details',
    'previous_price',
    'supplier_extended_amount',
}


def format_update_email_value(value):
    if value is None or value == '':
        return 'None'
    if hasattr(value, 'tzinfo'):
        if timezone.is_aware(value):
            value = timezone.localtime(value)
        return value.strftime('%d %b %Y %H:%M')
    if hasattr(value, 'all') and callable(value.all):
        value = list(value.all())
    if isinstance(value, (list, tuple, set)):
        return ', '.join(str(item) for item in value) or 'None'
    if isinstance(value, bool):
        return 'Yes' if value else 'No'
    return str(value)


def build_update_email_changes(original, updated, changed_fields):
    """Build the same customer-safe before/after summary as Django Admin."""
    changes = []
    for field_name in changed_fields:
        if field_name in UPDATE_EMAIL_EXCLUDED_FIELDS:
            continue
        if field_name == 'add_ons':
            old_value = list(original.add_ons.all())
            new_value = list(updated.add_ons.all())
        else:
            old_value = getattr(original, field_name, None)
            new_value = getattr(updated, field_name, None)

        try:
            label = UPDATE_EMAIL_FIELD_LABELS.get(
                field_name,
                updated._meta.get_field(field_name).verbose_name.title(),
            )
        except Exception:
            label = field_name.replace('_', ' ').title()
        changes.append({
            'label': label,
            'old': format_update_email_value(old_value),
            'new': format_update_email_value(new_value),
        })
    return changes
