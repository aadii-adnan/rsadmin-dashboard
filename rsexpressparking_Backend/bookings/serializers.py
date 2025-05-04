from rest_framework import serializers
from .models import Booking
from services.models import AddOn, Coupon
from core.models import Status
from core.serializers import StatusSerializer
from services.serializers import CouponSerializer

class BookingSerializer(serializers.ModelSerializer):
    add_ons = serializers.PrimaryKeyRelatedField(
        queryset=AddOn.objects.all(), many=True
    )
    status = serializers.PrimaryKeyRelatedField(
        queryset=Status.objects.all(), required=False
    )
    CouponSerializer = serializers.PrimaryKeyRelatedField(
        queryset=Coupon.objects.all(), many=True, required=False
    )

    class Meta:
        model = Booking
        fields = '__all__'
