from django.db import migrations


def add_no_show_status(apps, schema_editor):
    Status = apps.get_model('core', 'Status')
    Status.objects.get_or_create(name='No Show', type='booking')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_bookingsettings_social_media_email_content'),
    ]

    operations = [
        migrations.RunPython(add_no_show_status, migrations.RunPython.noop),
    ]
