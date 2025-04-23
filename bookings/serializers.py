from rest_framework import serializers
from .models import Booking
from services.serializers import AddOnSerializer, ServiceSerializer
from services.models import AddOn

class BookingSerializer(serializers.ModelSerializer):
    add_ons = serializers.PrimaryKeyRelatedField(
        queryset=AddOn.objects.all(), many=True
    )

    class Meta:
        model = Booking
        fields = '__all__'
