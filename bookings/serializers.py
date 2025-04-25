from rest_framework import serializers
from .models import Booking
from services.models import AddOn
from core.serializers import StatusSerializer

class BookingSerializer(serializers.ModelSerializer):
    add_ons = serializers.PrimaryKeyRelatedField(
        queryset=AddOn.objects.all(), many=True
    )
    status = StatusSerializer()

    class Meta:
        model = Booking
        fields = '__all__'
