from datetime import datetime, timezone as dt_timezone
from decimal import Decimal

from django.test import SimpleTestCase, TestCase
from django.urls import resolve
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.models import Status
from services.models import AddOn, Service
from users.models import Supplier

from .models import Booking
from .serializers import SupplierBookingSerializer


class SupplierTokenUrlTests(SimpleTestCase):
    def test_documented_supplier_token_routes_exist(self):
        self.assertIs(resolve('/api/token/').func.view_class, TokenObtainPairView)
        self.assertIs(resolve('/api/token/refresh/').func.view_class, TokenRefreshView)


class SupplierBookingSerializerTests(TestCase):
    def setUp(self):
        self.supplier = Supplier.objects.create(
            name='Example Supplier',
            booking_id_prefix='SUP',
        )
        self.service = Service.objects.create(
            name='Meet and Greet',
            description='Short description',
            long_description='Long description',
            base_price=Decimal('50.00'),
            per_day_price=Decimal('10.00'),
            enabled=True,
            website='rsexpressparking',
        )
        self.add_on = AddOn.objects.create(
            name='Baby Seat',
            price=Decimal('10.00'),
            active=True,
        )
        self.confirmed_status = Status.objects.create(name='Confirmed', type='booking')

    def payload(self, **overrides):
        data = {
            'service': self.service.id,
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@example.com',
            'contact_no': '+353871234567',
            'total_passengers': 2,
            'car_registration_no': '192-D-1234',
            'car_model': 'Corolla',
            'car_colour': 'Silver',
            'car_manufacturer': 'Toyota',
            'departure_terminal': 'T1',
            'return_terminal': 'T1',
            'departure_flight_number': 'FR1234',
            'return_flight_number': 'FR5678',
            'departure_time': '2025-06-01T05:00:00',
            'return_time': '2025-06-08T17:00:00',
            'total_price': '120.00',
            'add_ons': [self.add_on.id],
            'website': 'rsexpressparking',
        }
        data.update(overrides)
        return data

    def test_valid_payload_defaults_discounted_price_and_treats_naive_datetimes_as_utc(self):
        serializer = SupplierBookingSerializer(
            data=self.payload(),
            context={'supplier': self.supplier},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['discounted_price'], Decimal('120.00'))
        self.assertEqual(serializer.validated_data['departure_time'].tzinfo, dt_timezone.utc)
        self.assertEqual(serializer.validated_data['return_time'].tzinfo, dt_timezone.utc)

    def test_return_time_must_be_after_departure_time(self):
        serializer = SupplierBookingSerializer(
            data=self.payload(return_time='2025-06-01T05:00:00'),
            context={'supplier': self.supplier},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('return_time', serializer.errors)

    def test_custom_booking_id_is_required_when_supplier_uses_custom_ids(self):
        self.supplier.use_custom_booking_ids = True
        self.supplier.save(update_fields=['use_custom_booking_ids'])

        serializer = SupplierBookingSerializer(
            data=self.payload(),
            context={'supplier': self.supplier},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('booking_id', serializer.errors)

    def test_duplicate_custom_booking_id_is_rejected(self):
        self.supplier.use_custom_booking_ids = True
        self.supplier.save(update_fields=['use_custom_booking_ids'])
        Booking.objects.create(
            booking_id='SUP-EXISTING',
            supplier=self.supplier,
            service=self.service,
            first_name='Jane',
            last_name='Doe',
            email='jane@example.com',
            contact_no='+353871111111',
            total_passengers=1,
            car_registration_no='191-D-1111',
            car_model='Yaris',
            car_colour='Blue',
            car_manufacturer='Toyota',
            departure_terminal='T1',
            return_terminal='T1',
            departure_time=datetime(2025, 6, 1, 5, tzinfo=dt_timezone.utc),
            return_time=datetime(2025, 6, 8, 17, tzinfo=dt_timezone.utc),
            total_price=Decimal('120.00'),
            discounted_price=Decimal('120.00'),
            status=self.confirmed_status,
        )

        serializer = SupplierBookingSerializer(
            data=self.payload(booking_id='SUP-EXISTING'),
            context={'supplier': self.supplier},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('booking_id', serializer.errors)

    def test_supplier_response_matches_documented_add_ons_shape(self):
        serializer = SupplierBookingSerializer(
            data=self.payload(),
            context={'supplier': self.supplier},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

        booking = serializer.save(supplier=self.supplier, status=self.confirmed_status)
        data = SupplierBookingSerializer(booking).data

        self.assertNotIn('add_ons_detail', data)
        self.assertEqual(data['add_ons'][0]['id'], self.add_on.id)
        self.assertEqual(data['booking_id'][:4], 'SUP-')
