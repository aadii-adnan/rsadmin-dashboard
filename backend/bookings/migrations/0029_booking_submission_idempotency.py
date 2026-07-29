from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0028_booking_additional_click_ids'),
    ]

    operations = [
        migrations.AddField(
            model_name='bookinguser',
            name='journey_key',
            field=models.UUIDField(blank=True, editable=False, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='booking',
            name='booking_user',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='booking',
                to='bookings.bookinguser',
            ),
        ),
        migrations.AddField(
            model_name='booking',
            name='submission_fingerprint',
            field=models.CharField(blank=True, editable=False, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name='booking',
            name='submission_key',
            field=models.UUIDField(blank=True, editable=False, null=True, unique=True),
        ),
    ]
