from django.db import migrations, models


def normalize_phone_number(value):
    digits = "".join(character for character in str(value or "") if character.isdigit())
    if not digits:
        return None
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("3530"):
        digits = f"353{digits[4:]}"
    elif digits.startswith("0"):
        digits = f"353{digits[1:]}"
    return digits or None


def backfill_normalized_phone(apps, schema_editor):
    Booking = apps.get_model("bookings", "Booking")
    pending = []
    for booking in Booking.objects.only("id", "contact_no").iterator(chunk_size=1000):
        booking.contact_no_normalized = normalize_phone_number(booking.contact_no)
        pending.append(booking)
        if len(pending) == 1000:
            Booking.objects.bulk_update(pending, ["contact_no_normalized"])
            pending = []
    if pending:
        Booking.objects.bulk_update(pending, ["contact_no_normalized"])


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0026_booking_fbclid_booking_gclid_booking_referrer_url_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="contact_no_normalized",
            field=models.CharField(blank=True, db_index=True, editable=False, max_length=32, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="customer_experience",
            field=models.CharField(
                blank=True,
                choices=[("good", "Good"), ("bad", "Bad")],
                max_length=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="customer_experience_details",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_normalized_phone, migrations.RunPython.noop),
    ]
