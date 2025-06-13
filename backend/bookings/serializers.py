from rest_framework import serializers
from .models import Booking, BookingUser
from services.models import AddOn, Coupon, Service
from core.models import Status
from core.serializers import StatusSerializer
from services.serializers import AddOnSerializer

class BookingSerializer(serializers.ModelSerializer):
    # This will be used for writes (POST/PUT)
    add_ons = serializers.PrimaryKeyRelatedField(
        queryset=AddOn.objects.all(), many=True, write_only=True
    )
    # This will be used for reads (GET)
    add_ons_detail = AddOnSerializer(source='add_ons', many=True, read_only=True)
    status = StatusSerializer(read_only=True)
    coupon = serializers.PrimaryKeyRelatedField(
        queryset=Coupon.objects.all(), 
        required=False,
        allow_null=True
    )
    service_name = serializers.SerializerMethodField()
    service_per_day_price = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = '__all__'
        extra_kwargs = {
            'discounted_price': {'required': False, 'allow_null': True},
            'status': {'required': False},
        }

    def to_representation(self, instance):
        """Show add_ons as detailed objects on read."""
        ret = super().to_representation(instance)
        # Replace add_ons (ids) with add_ons_detail (objects) for GET
        ret['add_ons'] = AddOnSerializer(instance.add_ons.all(), many=True).data
        return ret

    def get_service_name(self, obj):
        return obj.service.name if obj.service else None
    
    def get_service_per_day_price(self, obj):
        return obj.service.per_day_price if obj.service else None

class BookingUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingUser
        fields = '__all__'