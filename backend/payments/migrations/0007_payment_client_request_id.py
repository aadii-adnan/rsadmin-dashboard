from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0006_credittransaction'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='client_request_id',
            field=models.UUIDField(blank=True, editable=False, null=True, unique=True),
        ),
    ]
