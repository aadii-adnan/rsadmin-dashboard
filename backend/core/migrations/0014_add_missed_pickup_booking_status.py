from django.db import migrations


def add_missed_pickup_status(apps, schema_editor):
    Status = apps.get_model('core', 'Status')
    Status.objects.get_or_create(name='Missed Pickup', type='booking')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_add_no_show_booking_status'),
    ]

    operations = [
        migrations.RunPython(
            add_missed_pickup_status,
            migrations.RunPython.noop,
        ),
    ]
