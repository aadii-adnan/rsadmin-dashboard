from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import URLValidator
from rest_framework import serializers
from django.db import transaction

from .models import Booking, BookingUser
from core.permissions import is_active_supplier, is_full_super_admin
from services.models import AddOn, Coupon, Service
from core.models import Status
from core.serializers import StatusSerializer
from services.serializers import AddOnSerializer
from datetime import timezone as dt_timezone
from decimal import Decimal


ATTRIBUTION_FIELD_MAX_LENGTHS = {
    'utm_source': 255,
    'utm_medium': 255,
    'utm_campaign': 255,
    'utm_term': 255,
    'utm_content': 255,
    'gclid': 255,
    'gbraid': 255,
    'wbraid': 255,
    'gad_source': 255,
    'msclkid': 255,
    'fbclid': 255,
    'referrer_url': 500,
}
HTTP_URL_VALIDATOR = URLValidator(schemes=('http', 'https'))


STAFF_COMMON_EDITABLE_FIELDS = {
    'first_name', 'last_name', 'email', 'contact_no', 'total_passengers',
    'car_registration_no', 'car_model', 'car_colour', 'car_manufacturer',
    'departure_terminal', 'return_terminal', 'departure_flight_number',
    'return_flight_number', 'departure_time', 'return_time', 'service',
    'add_ons', 'status', 'note',
}
STAFF_EXPERIENCE_EDITABLE_FIELDS = {
    'customer_experience', 'customer_experience_details',
}
STAFF_PRICING_EDITABLE_FIELDS = {
    'total_price', 'coupon', 'discounted_price', 'bonus_points_used',
    'previous_price',
}


def get_staff_editable_fields(user, booking):
    """Return the Django-Admin-equivalent editable fields for this booking."""
    fields = set(STAFF_COMMON_EDITABLE_FIELDS)
    if is_full_super_admin(user):
        fields.update(STAFF_EXPERIENCE_EDITABLE_FIELDS)
        fields.update(STAFF_PRICING_EDITABLE_FIELDS)
        if booking.supplier_id:
            fields.add('supplier_extended_amount')
    elif getattr(user, 'is_manager', False):
        fields.update(STAFF_EXPERIENCE_EDITABLE_FIELDS)
    elif is_active_supplier(user):
        fields.update(STAFF_PRICING_EDITABLE_FIELDS)
    return fields


def sanitize_attribution(data):
    """Drop malformed optional attribution so it can never block a booking."""
    if not hasattr(data, 'copy'):
        return data

    cleaned_data = data.copy()
    for field_name, max_length in ATTRIBUTION_FIELD_MAX_LENGTHS.items():
        if field_name not in cleaned_data:
            continue

        value = cleaned_data.get(field_name)
        if not isinstance(value, str):
            cleaned_data.pop(field_name, None)
            continue

        value = value.strip()
        if not value or len(value) > max_length:
            cleaned_data.pop(field_name, None)
            continue

        if field_name == 'referrer_url':
            try:
                HTTP_URL_VALIDATOR(value)
            except DjangoValidationError:
                cleaned_data.pop(field_name, None)
                continue

        cleaned_data[field_name] = value

    return cleaned_data


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
            'contact_no_normalized': {'read_only': True},
            'customer_experience': {'read_only': True},
            'customer_experience_details': {'read_only': True},
            'supplier_extended_amount': {'read_only': True},
            'supplier_commission_percentage': {'read_only': True},
            'source_channel': {'read_only': True},
            'submission_key': {'read_only': True},
            'submission_fingerprint': {'read_only': True},
        }

    def to_internal_value(self, data):
        return super().to_internal_value(sanitize_attribution(data))

    def to_representation(self, instance):
        """Show add_ons as detailed objects on read."""
        ret = super().to_representation(instance)
        ret.pop('supplier_extended_amount', None)
        ret.pop('supplier_commission_percentage', None)
        ret.pop('contact_no_normalized', None)
        ret.pop('customer_experience', None)
        ret.pop('customer_experience_details', None)
        ret.pop('submission_key', None)
        ret.pop('submission_fingerprint', None)
        # Replace add_ons (ids) with add_ons_detail (objects) for GET
        ret['add_ons'] = AddOnSerializer(instance.add_ons.all(), many=True).data
        return ret

    def get_service_name(self, obj):
        return obj.service.name if obj.service else None
    
    def get_service_per_day_price(self, obj):
        return obj.service.per_day_price if obj.service else None


class StaffBookingListSerializer(serializers.ModelSerializer):
    """Read-only, role-safe data for the staff bookings table.

    This deliberately does not inherit from the general BookingSerializer,
    whose all-model-fields contract is appropriate for existing workflows but
    too broad for a staff list endpoint.
    """

    service_name = serializers.CharField(source='service.name', read_only=True)
    add_on_names = serializers.SerializerMethodField()
    status_name = serializers.CharField(source='status.name', read_only=True, allow_null=True)
    price = serializers.SerializerMethodField()
    source = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'first_name', 'last_name', 'contact_no',
            'car_registration_no', 'car_model', 'car_colour', 'car_manufacturer',
            'departure_terminal', 'return_terminal', 'departure_time', 'return_time',
            'service_name', 'add_on_names', 'status_name', 'created_at', 'is_viewed',
            'price', 'source', 'website',
        ]
        read_only_fields = fields

    def _request_user(self):
        request = self.context.get('request')
        return getattr(request, 'user', None)

    def get_add_on_names(self, booking):
        return [add_on.name for add_on in booking.add_ons.all()]

    def get_price(self, booking):
        user = self._request_user()
        if is_full_super_admin(user):
            return {
                'total': str(booking.total_price),
                'discounted': str(booking.discounted_price) if booking.discounted_price is not None else None,
            }

        if is_active_supplier(user):
            extension = Decimal(str(booking.supplier_extended_amount or 0))
            total = max(Decimal(str(booking.total_price)) - extension, Decimal('0.00'))
            discounted = None
            if booking.discounted_price is not None:
                discounted = max(
                    Decimal(str(booking.discounted_price)) - extension,
                    Decimal('0.00'),
                )
            return {
                'total': str(total),
                'discounted': str(discounted) if discounted is not None else None,
            }

        return None

    def get_source(self, booking):
        if booking.supplier_id is not None:
            return 'Supplier'
        return booking.source_channel or None

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        user = self._request_user()

        # Django Admin shows price to full super-admins and suppliers, but not
        # managers. Source and website are full-super-admin list columns only.
        if not (is_full_super_admin(user) or is_active_supplier(user)):
            representation.pop('price', None)
        if not is_full_super_admin(user):
            representation.pop('source', None)
            representation.pop('website', None)

        return representation


class StaffBookingDetailSerializer(serializers.ModelSerializer):
    """Read-only operational detail data for one staff-authorized booking.

    The structure mirrors the useful Django Admin fieldsets without exposing
    model-wide/internal fields. Role-specific sections are removed from the
    representation on the server, rather than hidden only by the browser.
    """

    customer = serializers.SerializerMethodField()
    vehicle = serializers.SerializerMethodField()
    travel = serializers.SerializerMethodField()
    service_details = serializers.SerializerMethodField()
    status_details = serializers.SerializerMethodField()
    customer_experience = serializers.SerializerMethodField()
    pricing = serializers.SerializerMethodField()
    supplier = serializers.SerializerMethodField()
    marketing_attribution = serializers.SerializerMethodField()
    editable_fields = serializers.SerializerMethodField()
    actions = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'created_at', 'modified_at', 'is_viewed',
            'customer', 'vehicle', 'travel', 'service_details',
            'status_details', 'customer_experience', 'pricing', 'supplier',
            'marketing_attribution', 'editable_fields', 'actions',
        ]
        read_only_fields = fields

    def _request_user(self):
        request = self.context.get('request')
        return getattr(request, 'user', None)

    def get_customer(self, booking):
        return {
            'first_name': booking.first_name,
            'last_name': booking.last_name,
            'email': booking.email,
            'contact_no': booking.contact_no,
            'total_passengers': booking.total_passengers,
        }

    def get_vehicle(self, booking):
        return {
            'registration': booking.car_registration_no,
            'manufacturer': booking.car_manufacturer,
            'model': booking.car_model,
            'colour': booking.car_colour,
        }

    def get_travel(self, booking):
        return {
            'departure_terminal': booking.departure_terminal,
            'return_terminal': booking.return_terminal,
            'departure_flight_number': booking.departure_flight_number,
            'return_flight_number': booking.return_flight_number,
            'departure_time': booking.departure_time,
            'return_time': booking.return_time,
        }

    def get_service_details(self, booking):
        return {
            'id': booking.service_id,
            'name': booking.service.name if booking.service_id else None,
            'add_ons': [
                {'id': add_on.id, 'name': add_on.name}
                for add_on in booking.add_ons.all()
            ],
        }

    def get_status_details(self, booking):
        return {
            'id': booking.status_id,
            'name': booking.status.name if booking.status_id else None,
            'note': booking.note,
        }

    def get_customer_experience(self, booking):
        previous = booking.get_previous_customer_experience()
        previous_data = None
        if previous:
            previous_data = {
                'booking_id': previous.booking_id or str(previous.pk),
                'experience': previous.customer_experience,
                'experience_label': previous.get_customer_experience_display(),
                'details': previous.customer_experience_details,
                'return_time': previous.return_time,
            }
        return {
            'experience': booking.customer_experience,
            'experience_label': booking.get_customer_experience_display() if booking.customer_experience else None,
            'details': booking.customer_experience_details,
            'previous_reviewed': previous_data,
        }

    def get_pricing(self, booking):
        user = self._request_user()
        if is_full_super_admin(user):
            return {
                'total': str(booking.total_price),
                'discounted': str(booking.discounted_price) if booking.discounted_price is not None else None,
                'coupon_code': booking.coupon.code if booking.coupon_id else None,
                'coupon_id': booking.coupon_id,
                'bonus_points_used': str(booking.bonus_points_used),
                'previous_price': str(booking.previous_price) if booking.previous_price is not None else None,
                'supplier_extended_amount': str(booking.supplier_extended_amount) if booking.supplier_id else None,
            }
        if is_active_supplier(user):
            return {
                # Suppliers can edit these Django Admin pricing fields. Use
                # the stored values here so saving an unchanged value cannot
                # accidentally turn the net supplier display into the gross
                # booking amount. The extension itself remains hidden.
                'total': str(booking.total_price),
                'discounted': str(booking.discounted_price) if booking.discounted_price is not None else None,
                'coupon_code': booking.coupon.code if booking.coupon_id else None,
                'coupon_id': booking.coupon_id,
                'bonus_points_used': str(booking.bonus_points_used),
                'previous_price': str(booking.previous_price) if booking.previous_price is not None else None,
            }
        return None

    def get_supplier(self, booking):
        if not (is_full_super_admin(self._request_user()) and booking.supplier_id):
            return None
        return {
            'id': booking.supplier_id,
            'name': booking.supplier.name,
            'booking_id_prefix': booking.supplier.booking_id_prefix,
        }

    def get_marketing_attribution(self, booking):
        if not is_full_super_admin(self._request_user()):
            return None
        return {
            'source_channel': booking.source_channel,
            'utm_source': booking.utm_source,
            'utm_medium': booking.utm_medium,
            'utm_campaign': booking.utm_campaign,
            'utm_term': booking.utm_term,
            'utm_content': booking.utm_content,
            'gclid': booking.gclid,
            'gbraid': booking.gbraid,
            'wbraid': booking.wbraid,
            'gad_source': booking.gad_source,
            'msclkid': booking.msclkid,
            'fbclid': booking.fbclid,
            'referrer_url': booking.referrer_url,
        }

    def get_editable_fields(self, booking):
        return sorted(get_staff_editable_fields(self._request_user(), booking))

    def get_actions(self, booking):
        """Capabilities are informational only; views enforce them again."""
        user = self._request_user()
        can_download_invoice = not getattr(user, 'is_manager', False)
        return {
            'documents': {
                'booking_form': True,
                'invoice': can_download_invoice,
            },
            'status_actions': [
                {'id': status.id, 'name': status.name}
                for status in Status.objects.filter(
                    type='booking',
                    name__in=['Completed', 'Cancelled', 'No Show', 'Missed Pickup'],
                ).order_by('name')
            ],
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        user = self._request_user()
        if not (is_full_super_admin(user) or is_active_supplier(user)):
            representation.pop('pricing', None)
        if not is_full_super_admin(user):
            representation.pop('supplier', None)
            representation.pop('marketing_attribution', None)
        return representation


class StaffBookingUpdateSerializer(serializers.ModelSerializer):
    """Restricted write contract for one already-authorized staff booking."""

    add_ons = serializers.PrimaryKeyRelatedField(queryset=AddOn.objects.all(), many=True, required=False)
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all(), required=False)
    status = serializers.PrimaryKeyRelatedField(
        queryset=Status.objects.filter(type='booking'), required=False, allow_null=True,
    )
    coupon = serializers.PrimaryKeyRelatedField(queryset=Coupon.objects.all(), required=False, allow_null=True)
    total_passengers = serializers.IntegerField(required=False, min_value=1, allow_null=True)
    departure_time = serializers.DateTimeField(required=False)
    return_time = serializers.DateTimeField(required=False)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.00'), required=False)
    discounted_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.00'), required=False, allow_null=True)
    bonus_points_used = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.00'), required=False)
    previous_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.00'), required=False, allow_null=True)
    supplier_extended_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.00'), required=False)
    customer_experience = serializers.ChoiceField(
        choices=Booking.CustomerExperience.choices, required=False, allow_null=True,
    )
    customer_experience_details = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Booking
        fields = [
            'first_name', 'last_name', 'email', 'contact_no', 'total_passengers',
            'car_registration_no', 'car_model', 'car_colour', 'car_manufacturer',
            'departure_terminal', 'return_terminal', 'departure_flight_number',
            'return_flight_number', 'departure_time', 'return_time', 'service',
            'add_ons', 'status', 'note', 'customer_experience',
            'customer_experience_details', 'total_price', 'coupon',
            'discounted_price', 'bonus_points_used', 'previous_price',
            'supplier_extended_amount',
        ]
        extra_kwargs = {
            'note': {'required': False, 'allow_blank': True, 'allow_null': True},
            'departure_flight_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'return_flight_number': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def _allowed_fields(self):
        request = self.context.get('request')
        return get_staff_editable_fields(getattr(request, 'user', None), self.instance)

    def to_internal_value(self, data):
        if not hasattr(data, 'keys'):
            raise serializers.ValidationError({
                'non_field_errors': 'Expected an object of booking fields.'
            })
        disallowed = set(data.keys()) - self._allowed_fields()
        if disallowed:
            raise serializers.ValidationError({
                field: 'You are not allowed to edit this field.'
                for field in sorted(disallowed)
            })
        return super().to_internal_value(data)

    def validate(self, attrs):
        departure_time = attrs.get('departure_time', self.instance.departure_time)
        return_time = attrs.get('return_time', self.instance.return_time)
        if return_time <= departure_time:
            raise serializers.ValidationError({
                'return_time': 'Return time must be after departure time.'
            })
        return attrs

    def update(self, instance, validated_data):
        add_ons = validated_data.pop('add_ons', None)
        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)

        try:
            instance.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc

        with transaction.atomic():
            instance.save()
            if add_ons is not None:
                instance.add_ons.set(add_ons)
        return instance


class StaffBookingCreateSerializer(serializers.ModelSerializer):
    """Explicit, staff-only contract for creating one operational booking."""

    booking_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all())
    add_ons = serializers.PrimaryKeyRelatedField(
        queryset=AddOn.objects.filter(active=True), many=True, required=False,
    )
    status = serializers.PrimaryKeyRelatedField(
        queryset=Status.objects.filter(type='booking'), required=False, allow_null=True,
    )
    coupon = serializers.PrimaryKeyRelatedField(
        queryset=Coupon.objects.all(), required=False, allow_null=True,
    )
    total_passengers = serializers.IntegerField(min_value=1)
    departure_time = serializers.DateTimeField()
    return_time = serializers.DateTimeField()
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.00'))
    discounted_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('0.00'), required=False, allow_null=True,
    )
    bonus_points_used = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('0.00'), required=False,
    )
    website = serializers.ChoiceField(
        choices=('rsexpressparking', 'dublinairportparking'), required=False,
        default='rsexpressparking',
    )

    class Meta:
        model = Booking
        fields = [
            'booking_id', 'service', 'add_ons', 'status', 'coupon', 'website',
            'first_name', 'last_name', 'email', 'contact_no', 'total_passengers',
            'car_registration_no', 'car_model', 'car_colour', 'car_manufacturer',
            'departure_terminal', 'return_terminal', 'departure_flight_number',
            'return_flight_number', 'departure_time', 'return_time', 'total_price',
            'discounted_price', 'bonus_points_used', 'note',
        ]
        extra_kwargs = {
            'departure_flight_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'return_flight_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'note': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def _user(self):
        return getattr(self.context.get('request'), 'user', None)

    def validate_service(self, service):
        if not service.enabled:
            raise serializers.ValidationError('This service is not currently available.')
        return service

    def validate_coupon(self, coupon):
        if coupon is not None and not coupon.is_valid():
            raise serializers.ValidationError('This coupon is invalid, expired, or fully used.')
        return coupon

    def validate(self, attrs):
        user = self._user()
        is_supplier_user = is_active_supplier(user)
        supplier = getattr(user, 'supplier_profile', None) if is_supplier_user else None

        if attrs['return_time'] <= attrs['departure_time']:
            raise serializers.ValidationError({
                'return_time': 'Return time must be after departure time.'
            })

        if is_supplier_user:
            # Keep the existing supplier-create behaviour: supplier bookings
            # always belong to the authenticated supplier and use the RS site.
            attrs['website'] = 'rsexpressparking'
            if attrs.get('status') is not None:
                raise serializers.ValidationError({
                    'status': 'Supplier booking status is set by the server.'
                })
            if attrs['service'].website not in ('rsexpressparking', 'both'):
                raise serializers.ValidationError({
                    'service': 'This service is not available for supplier bookings.'
                })
            booking_id = attrs.get('booking_id')
            if booking_id and str(booking_id).strip():
                attrs['booking_id'] = str(booking_id).strip()
                if Booking.objects.filter(booking_id=attrs['booking_id']).exists():
                    raise serializers.ValidationError({
                        'booking_id': 'A booking with this booking ID already exists.'
                    })
            elif supplier and supplier.use_custom_booking_ids:
                raise serializers.ValidationError({
                    'booking_id': 'This supplier uses custom booking IDs. Please provide a booking ID.'
                })
            else:
                attrs.pop('booking_id', None)
        else:
            if attrs.get('booking_id'):
                raise serializers.ValidationError({
                    'booking_id': 'Booking IDs are generated by the server.'
                })
            attrs.pop('booking_id', None)
            if attrs.get('status') is None:
                raise serializers.ValidationError({'status': 'This field is required.'})
            if getattr(user, 'is_manager', False) and attrs['status'].name.lower() in ('pending', 'payment failed'):
                raise serializers.ValidationError({
                    'status': 'Managers cannot create Pending or Payment Failed bookings.'
                })
            website = attrs.get('website', 'rsexpressparking')
            if attrs['service'].website not in ('both', website):
                raise serializers.ValidationError({
                    'service': 'This service is not available for the selected website.'
                })

        coupon = attrs.get('coupon')
        if coupon is not None and coupon.minimum_order_value > 0 and attrs['total_price'] < coupon.minimum_order_value:
            raise serializers.ValidationError({
                'coupon': f'This coupon requires a minimum order value of €{coupon.minimum_order_value:g}.'
            })

        if attrs.get('discounted_price') is None:
            attrs['discounted_price'] = attrs['total_price']
        return attrs

    def create(self, validated_data):
        add_ons = validated_data.pop('add_ons', [])
        user = self._user()
        if is_active_supplier(user):
            validated_data['supplier'] = user.supplier_profile
            try:
                validated_data['status'] = Status.objects.get(name='Confirmed', type='booking')
            except Status.DoesNotExist as exc:
                raise serializers.ValidationError({
                    'status': 'System configuration error: Confirmed status not found.'
                }) from exc

        booking = Booking(**validated_data)
        try:
            booking.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc

        with transaction.atomic():
            booking.save()
            if add_ons:
                booking.add_ons.set(add_ons)
        return booking


class StaffBookingStatusActionSerializer(serializers.Serializer):
    """Explicit, allow-listed operational status transition input."""

    ALLOWED_STATUS_NAMES = ('Completed', 'Cancelled', 'No Show', 'Missed Pickup')
    status = serializers.PrimaryKeyRelatedField(
        queryset=Status.objects.filter(type='booking'),
    )

    def validate_status(self, value):
        if value.name not in self.ALLOWED_STATUS_NAMES:
            raise serializers.ValidationError(
                'This status is not available as a staff action.'
            )
        return value


class StaffBookingBulkActionSerializer(serializers.Serializer):
    """Small, explicit input contract for selected-row staff operations."""

    ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
        max_length=100,
    )
    departure_date_from = serializers.DateField(required=False)
    departure_date_to = serializers.DateField(required=False)
    return_date_from = serializers.DateField(required=False)
    return_date_to = serializers.DateField(required=False)
    created_date_from = serializers.DateField(required=False)
    created_date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        for prefix in ('departure_date', 'return_date', 'created_date'):
            start = attrs.get(f'{prefix}_from')
            end = attrs.get(f'{prefix}_to')
            if start and end and start > end:
                raise serializers.ValidationError({
                    f'{prefix}_to': 'Must be on or after the start date.'
                })
        return attrs


class GuestBookingSerializer(serializers.ModelSerializer):
    """Read-only booking representation for the guest manage-booking flow.

    Explicit whitelist: the token holder proved email ownership, but supplier,
    coupon and bonus internals still must not leak.
    """
    add_ons = AddOnSerializer(many=True, read_only=True)
    status = StatusSerializer(read_only=True)
    service_name = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'service_name',
            'first_name',
            'car_registration_no', 'car_model', 'car_colour',
            'departure_time', 'return_time',
            'total_price', 'discounted_price',
            'add_ons', 'status', 'website',
        ]
        read_only_fields = fields

    def get_service_name(self, obj):
        return obj.service.name if obj.service else None


class BookingUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingUser
        fields = '__all__'
        extra_kwargs = {
            'journey_key': {'read_only': True},
        }

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret.pop('journey_key', None)
        return ret


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

        if booking_id and str(booking_id).strip():
            attrs['booking_id'] = str(booking_id).strip()
            if Booking.objects.filter(booking_id=attrs['booking_id']).exists():
                raise serializers.ValidationError({
                    'booking_id': 'A booking with this booking_id already exists.'
                })
        elif supplier and supplier.use_custom_booking_ids:
            raise serializers.ValidationError({
                'booking_id': 'This supplier uses custom booking IDs. Please provide booking_id.'
            })
        else:
            attrs.pop('booking_id', None)

        return attrs

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret.pop('add_ons_detail', None)
        ret['add_ons'] = AddOnSerializer(instance.add_ons.all(), many=True).data
        return ret
