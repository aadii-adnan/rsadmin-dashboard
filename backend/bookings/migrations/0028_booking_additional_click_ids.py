from django.db import migrations, models


def correct_microsoft_ads_sources(apps, schema_editor):
    Booking = apps.get_model("bookings", "Booking")
    paid_media = ("cpc", "ppc", "paid", "paidsearch", "paid-search")
    microsoft_source = models.Q(utm_source__icontains="bing") | models.Q(
        utm_source__icontains="microsoft"
    )
    paid_medium = models.Q()
    for value in paid_media:
        paid_medium |= models.Q(utm_medium__iexact=value)
    Booking.objects.filter(
        microsoft_source & paid_medium,
        source_channel="Google Ads",
    ).update(source_channel="Microsoft Ads")


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0027_booking_customer_experience"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="gbraid",
            field=models.CharField(
                blank=True,
                help_text="Google Ads aggregate app click id",
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="wbraid",
            field=models.CharField(
                blank=True,
                help_text="Google Ads aggregate web click id",
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="gad_source",
            field=models.CharField(
                blank=True,
                help_text="Google Ads aggregate source parameter",
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="msclkid",
            field=models.CharField(
                blank=True,
                help_text="Microsoft Ads click id",
                max_length=255,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="booking",
            name="source_channel",
            field=models.CharField(
                blank=True,
                help_text="Derived marketing channel (e.g. Google Ads, Microsoft Ads, Social Media, Organic Search, Referral, Direct).",
                max_length=30,
                null=True,
            ),
        ),
        migrations.RunPython(correct_microsoft_ads_sources, migrations.RunPython.noop),
    ]
