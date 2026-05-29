from rest_framework import serializers
from .models import Booking, BookingUser
from services.models import AddOn, Coupon, Service
from core.models import Status
from core.serializers import StatusSerializer
from services.serializers import AddOnSerializer
from datetime import timezone as dt_timezone
from decimal import Decimal

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
            'booking_id': {'read_only': True},
            'discounted_price': {'required': False, 'allow_null': True},
            'status': {'required': False},
            'supplier_extended_amount': {'read_only': True},
            'supplier_commission_percentage': {'read_only': True},
        }

    def to_representation(self, instance):
        """Show add_ons as detailed objects on read."""
        ret = super().to_representation(instance)
        ret.pop('supplier_extended_amount', None)
        ret.pop('supplier_commission_percentage', None)
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


class SupplierBookingSerializer(serializers.ModelSerializer):
    booking_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    contact_no = serializers.CharField(required=True, allow_blank=False, allow_null=False)
    total_passengers = serializers.IntegerField(required=True, min_value=1)
    departure_time = serializers.DateTimeField(default_timezone=dt_timezone.utc)
    return_time = serializers.DateTimeField(default_timezone=dt_timezone.utc)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.00'))
    discounted_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('0.00'), required=False, allow_null=True
    )
    website = serializers.ChoiceField(
        choices=('rsexpressparking', 'dublinairportparking'),
        required=False,
        default='rsexpressparking',
    )
    add_ons = serializers.PrimaryKeyRelatedField(
        queryset=AddOn.objects.filter(active=True), many=True, required=False
    )
    add_ons_detail = AddOnSerializer(source='add_ons', many=True, read_only=True)
    status = StatusSerializer(read_only=True)
    service_name = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'service', 'service_name',
            'first_name', 'last_name', 'email', 'contact_no', 'total_passengers',
            'car_registration_no', 'car_model', 'car_colour', 'car_manufacturer',
            'departure_terminal', 'return_terminal',
            'departure_flight_number', 'return_flight_number',
            'departure_time', 'return_time',
            'total_price', 'discounted_price',
            'add_ons', 'add_ons_detail',
            'website', 'note',
            'status', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'add_ons_detail']
        extra_kwargs = {
            'departure_flight_number': {'required': False, 'allow_blank': True},
            'return_flight_number': {'required': False, 'allow_blank': True},
            'discounted_price': {'required': False, 'allow_null': True},
            'website': {'required': False},
            'note': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def get_service_name(self, obj):
        return obj.service.name if obj.service else None

    def validate_service(self, service):
        if not service.enabled:
            raise serializers.ValidationError("This service is not available for supplier bookings.")
        if service.website not in ('rsexpressparking', 'both'):
            raise serializers.ValidationError("This service is not available for supplier bookings.")
        return service

    def validate(self, attrs):
        supplier = self.context.get('supplier')
        booking_id = attrs.get('booking_id')

        if attrs['return_time'] <= attrs['departure_time']:
            raise serializers.ValidationError({
                'return_time': 'return_time must be after departure_time.'
            })

        if attrs.get('discounted_price') is None:
            attrs['discounted_price'] = attrs['total_price']

        if supplier and supplier.use_custom_booking_ids:
            if not booking_id or not str(booking_id).strip():
                raise serializers.ValidationError({
                    'booking_id': 'This supplier uses custom booking IDs. Please provide booking_id.'
                })
            attrs['booking_id'] = str(booking_id).strip()
            if Booking.objects.filter(booking_id=attrs['booking_id']).exists():
                raise serializers.ValidationError({
                    'booking_id': 'A booking with this booking_id already exists.'
                })
        else:
            attrs.pop('booking_id', None)

        return attrs

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret.pop('add_ons_detail', None)
        ret['add_ons'] = AddOnSerializer(instance.add_ons.all(), many=True).data
        return ret
