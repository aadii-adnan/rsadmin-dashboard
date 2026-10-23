from rest_framework import serializers

from .models import BookingSettings, Status


class StaffStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Status
        fields = ["id", "name", "type"]
        read_only_fields = ["id"]


class StaffBookingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingSettings
        fields = [
            "id", "min_hours_before_booking", "manager_emails", "dublin_manager_emails",
            "promotional_email_content", "pending_bookings_email_content",
            "dublin_promotional_email_content", "dublin_pending_bookings_email_content",
            "social_media_email_content",
        ]
        read_only_fields = ["id"]
