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
    status = StatusSerializer(read_only=True)
    coupon = serializers.PrimaryKeyRelatedField(
        queryset=Coupon.objects.all(), 
        required=False,
        allow_null=True
    )

    class Meta:
        model = Booking
        fields = '__all__'
        extra_kwargs = {
            'discounted_price': {'required': False, 'allow_null': True},
            'status': {'required': False},
        }