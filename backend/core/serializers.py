from rest_framework import serializers
from .models import Status, BookingSettings, OrderLimit

class StatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Status
        fields = ['id', 'name', 'type']



class BookingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingSettings
        fields = ['min_hours_before_booking']

class OrderLimitSerializer(serializers.ModelSerializer):
    service = serializers.SlugRelatedField(slug_field='slug', read_only=True)
    class Meta:
        model = OrderLimit
        fields = ['date', 'service', 'max_orders']