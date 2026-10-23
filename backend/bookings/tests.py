from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal
from types import SimpleNamespace
import uuid
from unittest.mock import patch

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.test import SimpleTestCase, TestCase, TransactionTestCase
from django.test.client import Client, RequestFactory
from django.template.loader import render_to_string
from django.urls import resolve
from django.utils.html import strip_tags
from django.utils import timezone
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.test import APIClient

from core.models import Status
from services.models import AddOn, Service
from users.models import Supplier

from .admin import BookingAdmin
from .models import Booking, BookingUser, classify_source, normalize_phone_number
from .booking_rules import get_cancellation_policy, validate_reschedule
from .serializers import BookingSerializer, SupplierBookingSerializer


class SupplierTokenUrlTests(SimpleTestCase):
    def test_documented_supplier_token_routes_exist(self):
        self.assertIs(resolve('/api/token/').func.view_class, TokenObtainPairView)
        self.assertIs(resolve('/api/token/refresh/').func.view_class, TokenRefreshView)


class CorsIdempotencyHeaderTests(SimpleTestCase):
    def test_local_booking_preflight_allows_idempotency_header(self):
        response = Client().options(
            '/api/bookings/booking-user/',
            HTTP_ORIGIN='http://localhost:5173',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS='content-type,idempotency-key',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response['Access-Control-Allow-Origin'],
            'http://localhost:5173',
        )
        self.assertIn(
            'idempotency-key',
            response['Access-Control-Allow-Headers'].lower(),
        )


class BookingIdempotencyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.pending_status = Status.objects.create(name='Pending', type='booking')
        self.service = Service.objects.create(
            name='Idempotent Meet and Greet',
            description='Short description',
            long_description='Long description',
            base_price=Decimal('50.00'),
            per_day_price=Decimal('10.00'),
            enabled=True,
            website='rsexpressparking',
        )
        self.journey_key = uuid.uuid4()
        self.lead_payload = {
            'first_name': 'Alison',
            'last_name': 'OKane',
            'email': 'alison@example.com',
            'contact_no': '+353871234567',
        }

    def booking_payload(self, booking_user_id=None, **overrides):
        data = {
            'service': self.service.id,
            'booking_user': booking_user_id,
            'first_name': 'Alison',
            'last_name': 'OKane',
            'email': 'alison@example.com',
            'contact_no': '+353871234567',
            'total_passengers': 2,
            'car_registration_no': '261-D-1234',
            'car_model': 'Corolla',
            'car_colour': 'Silver',
            'car_manufacturer': 'Toyota',
            'departure_terminal': '1',
            'return_terminal': '2',
            'departure_flight_number': 'EI123',
            'return_flight_number': 'EI456',
            'departure_time': '2026-08-15T05:00:00Z',
            'return_time': '2026-08-20T17:00:00Z',
            'total_price': '120.00',
            'discounted_price': '120.00',
            'add_ons': [],
            'website': 'rsexpressparking',
        }
        data.update(overrides)
        return data

    def test_lead_replay_updates_one_row(self):
        first = self.client.post(
            '/api/bookings/booking-user/',
            self.lead_payload,
            format='json',
            HTTP_IDEMPOTENCY_KEY=str(self.journey_key),
        )
        second = self.client.post(
            '/api/bookings/booking-user/',
            {**self.lead_payload, 'last_name': "O'Kane"},
            format='json',
            HTTP_IDEMPOTENCY_KEY=str(self.journey_key),
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data['id'], second.data['id'])
        self.assertEqual(BookingUser.objects.count(), 1)
        self.assertEqual(BookingUser.objects.get().last_name, "O'Kane")

    def test_booking_replay_returns_original_and_links_lead(self):
        lead = self.client.post(
            '/api/bookings/booking-user/',
            self.lead_payload,
            format='json',
            HTTP_IDEMPOTENCY_KEY=str(self.journey_key),
        )
        payload = self.booking_payload(lead.data['id'])

        first = self.client.post(
            '/api/bookings/',
            payload,
            format='json',
            HTTP_IDEMPOTENCY_KEY=str(self.journey_key),
        )
        second = self.client.post(
            '/api/bookings/',
            payload,
            format='json',
            HTTP_IDEMPOTENCY_KEY=str(self.journey_key),
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data['id'], second.data['id'])
        self.assertEqual(Booking.objects.count(), 1)
        self.assertEqual(Booking.objects.get().booking_user_id, lead.data['id'])

    def test_key_reuse_with_different_booking_returns_conflict(self):
        payload = self.booking_payload()
        first = self.client.post(
            '/api/bookings/',
            payload,
            format='json',
            HTTP_IDEMPOTENCY_KEY=str(self.journey_key),
        )
        conflict = self.client.post(
            '/api/bookings/',
            {**payload, 'car_model': 'Yaris'},
            format='json',
            HTTP_IDEMPOTENCY_KEY=str(self.journey_key),
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(Booking.objects.count(), 1)

    def test_legacy_requests_without_key_remain_compatible(self):
        first = self.client.post('/api/bookings/', self.booking_payload(), format='json')
        second = self.client.post('/api/bookings/', self.booking_payload(), format='json')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(Booking.objects.count(), 2)

    def test_invalid_attribution_is_discarded_without_blocking_booking(self):
        response = self.client.post(
            '/api/bookings/',
            self.booking_payload(
                referrer_url=(
                    'android-app://com.google.android.googlequicksearchbox/'
                    'https/www.google.com'
                ),
                utm_campaign='x' * 256,
            ),
            format='json',
        )

        self.assertEqual(response.status_code, 201, response.data)
        booking = Booking.objects.get(pk=response.data['id'])
        self.assertIsNone(booking.referrer_url)
        self.assertIsNone(booking.utm_campaign)
        self.assertEqual(booking.source_channel, 'Direct')

    def test_valid_http_attribution_is_preserved(self):
        response = self.client.post(
            '/api/bookings/',
            self.booking_payload(
                referrer_url='https://www.google.com/search?q=dublin+parking',
                utm_campaign=' summer-parking ',
            ),
            format='json',
        )

        self.assertEqual(response.status_code, 201, response.data)
        booking = Booking.objects.get(pk=response.data['id'])
        self.assertEqual(
            booking.referrer_url,
            'https://www.google.com/search?q=dublin+parking',
        )
        self.assertEqual(booking.utm_campaign, 'summer-parking')
        self.assertEqual(booking.source_channel, 'Organic Search')


class ConcurrentBookingIdempotencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.pending_status = Status.objects.create(name='Pending', type='booking')
        self.service = Service.objects.create(
            name='Concurrent Meet and Greet',
            description='Short description',
            long_description='Long description',
            base_price=Decimal('50.00'),
            per_day_price=Decimal('10.00'),
            enabled=True,
            website='rsexpressparking',
        )

    def test_concurrent_replays_create_one_booking(self):
        from concurrent.futures import ThreadPoolExecutor

        key = str(uuid.uuid4())
        payload = {
            'service': self.service.id,
            'first_name': 'Rapid',
            'last_name': 'Tap',
            'email': 'rapid@example.com',
            'contact_no': '+353871111111',
            'total_passengers': 1,
            'car_registration_no': '261-D-9999',
            'car_model': 'Golf',
            'car_colour': 'Black',
            'car_manufacturer': 'Volkswagen',
            'departure_terminal': '1',
            'return_terminal': '1',
            'departure_time': '2026-09-01T05:00:00Z',
            'return_time': '2026-09-05T17:00:00Z',
            'total_price': '100.00',
            'discounted_price': '100.00',
            'add_ons': [],
            'website': 'rsexpressparking',
        }

        def submit():
            return APIClient().post(
                '/api/bookings/',
                payload,
                format='json',
                HTTP_IDEMPOTENCY_KEY=key,
            ).status_code

        with ThreadPoolExecutor(max_workers=2) as executor:
            statuses = list(executor.map(lambda _: submit(), range(2)))

        self.assertEqual(sorted(statuses), [200, 201])
        self.assertEqual(Booking.objects.count(), 1)


class MarketingAttributionClassificationTests(SimpleTestCase):
    def test_google_click_identifiers_are_classified_as_google_ads(self):
        for field in ('gclid', 'gbraid', 'wbraid', 'gad_source'):
            with self.subTest(field=field):
                self.assertEqual(classify_source(**{field: 'test-value'}), 'Google Ads')

    def test_google_paid_utm_is_classified_as_google_ads(self):
        self.assertEqual(
            classify_source(utm_source='google', utm_medium='cpc'),
            'Google Ads',
        )

    def test_microsoft_click_id_is_classified_as_microsoft_ads(self):
        self.assertEqual(classify_source(msclkid='test-value'), 'Microsoft Ads')

    def test_bing_paid_utm_is_not_classified_as_google_ads(self):
        self.assertEqual(
            classify_source(utm_source='bing', utm_medium='cpc'),
            'Microsoft Ads',
        )

    def test_existing_social_and_organic_classification_is_preserved(self):
        self.assertEqual(classify_source(fbclid='test-value'), 'Social Media')
        self.assertEqual(
            classify_source(referrer_url='https://www.google.com/search?q=parking'),
            'Organic Search',
        )


class BookingAdminSourceDisplayTests(SimpleTestCase):
    def setUp(self):
        self.booking_admin = BookingAdmin(Booking, admin.site)

    def test_supplier_booking_is_displayed_as_supplier(self):
        booking = SimpleNamespace(supplier_id=1, source_channel='Direct')

        self.assertEqual(self.booking_admin.source_display(booking), 'Supplier')

    def test_direct_booking_keeps_its_marketing_source(self):
        booking = SimpleNamespace(supplier_id=None, source_channel='Direct')

        self.assertEqual(self.booking_admin.source_display(booking), 'Direct')


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

    def test_supplied_booking_id_is_preserved_without_supplier_prefix(self):
        serializer = SupplierBookingSerializer(
            data=self.payload(booking_id='JPD-42014'),
            context={'supplier': self.supplier},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        booking = serializer.save(supplier=self.supplier, status=self.confirmed_status)

        self.assertEqual(booking.booking_id, 'JPD-42014')

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
        self.assertNotIn('customer_experience', data)
        self.assertNotIn('customer_experience_details', data)
        self.assertNotIn('contact_no_normalized', data)
        self.assertEqual(data['add_ons'][0]['id'], self.add_on.id)
        self.assertEqual(data['booking_id'][:4], 'SUP-')


class NoShowBookingRuleTests(TestCase):
    def setUp(self):
        self.service = Service.objects.create(
            name='Meet and Greet',
            description='Short description',
            long_description='Long description',
            base_price=Decimal('50.00'),
            per_day_price=Decimal('10.00'),
            enabled=True,
            website='rsexpressparking',
        )
        self.no_show_status, _ = Status.objects.get_or_create(name='No Show', type='booking')
        self.booking = Booking.objects.create(
            service=self.service,
            first_name='No',
            last_name='Show',
            email='no.show@example.com',
            contact_no='+353871234567',
            total_passengers=1,
            car_registration_no='192-D-1234',
            car_model='Corolla',
            car_colour='Silver',
            car_manufacturer='Toyota',
            departure_terminal='T1',
            return_terminal='T1',
            departure_time=datetime(2026, 8, 1, 5, tzinfo=dt_timezone.utc),
            return_time=datetime(2026, 8, 8, 17, tzinfo=dt_timezone.utc),
            total_price=Decimal('120.00'),
            discounted_price=Decimal('120.00'),
            status=self.no_show_status,
        )

    def test_no_show_booking_cannot_be_cancelled(self):
        policy = get_cancellation_policy(
            self.booking,
            now=datetime(2026, 7, 1, tzinfo=dt_timezone.utc),
        )

        self.assertFalse(policy['allowed'])
        self.assertFalse(policy['refund_eligible'])

    def test_no_show_booking_cannot_be_rescheduled(self):
        error = validate_reschedule(
            self.booking,
            datetime(2026, 8, 2, 5, tzinfo=dt_timezone.utc),
            datetime(2026, 8, 9, 17, tzinfo=dt_timezone.utc),
            now=datetime(2026, 7, 1, tzinfo=dt_timezone.utc),
        )

        self.assertEqual(error, 'Cannot reschedule this booking.')


class StaffBookingListAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/bookings/staff/'

        self.pending_status = Status.objects.create(name='Pending', type='booking')
        self.payment_failed_status = Status.objects.create(name='Payment Failed', type='booking')
        self.confirmed_status = Status.objects.create(name='Confirmed', type='booking')
        self.cancelled_status = Status.objects.create(name='Cancelled', type='booking')

        self.service_a = Service.objects.create(
            name='Terminal One Meet and Greet',
            description='Short description',
            long_description='Long description',
            base_price=Decimal('50.00'),
            per_day_price=Decimal('10.00'),
            enabled=True,
            website='rsexpressparking',
        )
        self.service_b = Service.objects.create(
            name='Dublin Executive Parking',
            description='Short description',
            long_description='Long description',
            base_price=Decimal('60.00'),
            per_day_price=Decimal('12.00'),
            enabled=True,
            website='dublinairportparking',
        )

        self.super_admin = get_user_model().objects.create_user(
            username='super-admin',
            email='super-admin@example.com',
            password='test-password',
            is_superuser=True,
        )
        self.manager = get_user_model().objects.create_user(
            username='manager',
            email='manager@example.com',
            password='test-password',
            is_manager=True,
        )
        self.customer = get_user_model().objects.create_user(
            username='customer',
            email='customer@example.com',
            password='test-password',
        )

        self.active_supplier_user = get_user_model().objects.create_user(
            username='active-supplier',
            email='active-supplier@example.com',
            password='test-password',
            is_supplier=True,
        )
        self.active_supplier = Supplier.objects.create(
            name='Active Supplier',
            booking_id_prefix='ACT',
            user=self.active_supplier_user,
            is_active=True,
        )

        self.other_supplier_user = get_user_model().objects.create_user(
            username='other-supplier',
            email='other-supplier@example.com',
            password='test-password',
            is_supplier=True,
        )
        self.other_supplier = Supplier.objects.create(
            name='Other Supplier',
            booking_id_prefix='OTH',
            user=self.other_supplier_user,
            is_active=True,
        )

        self.inactive_supplier_user = get_user_model().objects.create_user(
            username='inactive-supplier',
            email='inactive-supplier@example.com',
            password='test-password',
            is_supplier=True,
        )
        Supplier.objects.create(
            name='Inactive Supplier',
            booking_id_prefix='INA',
            user=self.inactive_supplier_user,
            is_active=False,
        )

        base_departure = timezone.now() + timedelta(days=30)
        base_return = timezone.now() + timedelta(days=35)
        created_at = timezone.now() - timedelta(days=3)

        self.super_admin_booking = self._create_booking(
            booking_id='RS-BOOK-001',
            first_name='Alice',
            last_name='Smith',
            email='alice@example.com',
            contact_no='+353 87 123 4567',
            car_registration_no='261 D 1234',
            service=self.service_a,
            status=self.confirmed_status,
            website='rsexpressparking',
            source_channel='Google Ads',
            utm_campaign='Summer Sale',
            created_at=created_at,
            departure_time=base_departure,
            return_time=base_return,
        )
        self.pending_booking = self._create_booking(
            booking_id='RS-BOOK-002',
            first_name='Pending',
            last_name='Booking',
            email='pending@example.com',
            contact_no='+353 87 123 4568',
            car_registration_no='271 D 2222',
            service=self.service_a,
            status=self.pending_status,
            website='rsexpressparking',
            source_channel='Direct',
            created_at=created_at + timedelta(hours=1),
            departure_time=base_departure + timedelta(days=1),
            return_time=base_return + timedelta(days=1),
        )
        self.payment_failed_booking = self._create_booking(
            booking_id='RS-BOOK-003',
            first_name='Failed',
            last_name='Payment',
            email='failed@example.com',
            contact_no='+353 87 123 4569',
            car_registration_no='281 D 3333',
            service=self.service_b,
            status=self.payment_failed_status,
            website='dublinairportparking',
            source_channel='Referral',
            created_at=created_at + timedelta(hours=2),
            departure_time=base_departure + timedelta(days=2),
            return_time=base_return + timedelta(days=2),
        )
        self.active_supplier_booking = self._create_booking(
            booking_id='ACT-OWN-001',
            first_name='Supplier',
            last_name='Own',
            email='supplier@example.com',
            contact_no='+353 87 123 4570',
            car_registration_no='291 D 4444',
            service=self.service_a,
            status=self.confirmed_status,
            supplier=self.active_supplier,
            website='rsexpressparking',
            source_channel='Referral',
            created_at=created_at + timedelta(hours=3),
            departure_time=base_departure + timedelta(days=3),
            return_time=base_return + timedelta(days=3),
            supplier_extended_amount=Decimal('10.00'),
            total_price=Decimal('140.00'),
            discounted_price=Decimal('120.00'),
        )
        self.other_supplier_booking = self._create_booking(
            booking_id='OTH-OWN-001',
            first_name='Other',
            last_name='Supplier',
            email='other-supplier-booking@example.com',
            contact_no='+353 87 123 4571',
            car_registration_no='301 D 5555',
            service=self.service_b,
            status=self.confirmed_status,
            supplier=self.other_supplier,
            website='dublinairportparking',
            source_channel='Direct',
            created_at=created_at + timedelta(hours=4),
            departure_time=base_departure + timedelta(days=4),
            return_time=base_return + timedelta(days=4),
        )

    def _create_booking(self, **overrides):
        payload = {
            'service': self.service_a,
            'first_name': 'Default',
            'last_name': 'Booking',
            'email': 'default@example.com',
            'contact_no': '+353871111111',
            'total_passengers': 1,
            'car_registration_no': '201 D 0001',
            'car_model': 'Corolla',
            'car_colour': 'Silver',
            'car_manufacturer': 'Toyota',
            'departure_terminal': 'T1',
            'return_terminal': 'T2',
            'departure_time': timezone.now() + timedelta(days=10),
            'return_time': timezone.now() + timedelta(days=12),
            'total_price': Decimal('120.00'),
            'discounted_price': Decimal('120.00'),
            'created_at': timezone.now(),
        }
        payload.update(overrides)
        booking = Booking.objects.create(**payload)
        if 'created_at' in overrides:
            Booking.objects.filter(pk=booking.pk).update(created_at=overrides['created_at'])
            booking.refresh_from_db()
        return booking

    def _get(self, user=None, params=None):
        self.client.force_authenticate(user=user)
        return self.client.get(self.url, params or {})

    def test_anonymous_and_customer_are_denied(self):
        anonymous_response = self.client.get(self.url)
        self.assertIn(anonymous_response.status_code, (401, 403))

        customer_response = self._get(self.customer)
        self.assertIn(customer_response.status_code, (401, 403))

    def test_manager_sees_allowed_queryset_and_excludes_pending_states(self):
        response = self._get(self.manager)

        self.assertEqual(response.status_code, 200)
        returned_ids = {row['id'] for row in response.data['results']}
        self.assertIn(self.super_admin_booking.id, returned_ids)
        self.assertIn(self.active_supplier_booking.id, returned_ids)
        self.assertIn(self.other_supplier_booking.id, returned_ids)
        self.assertNotIn(self.pending_booking.id, returned_ids)
        self.assertNotIn(self.payment_failed_booking.id, returned_ids)

    def test_active_supplier_sees_only_own_bookings(self):
        response = self._get(self.active_supplier_user)

        self.assertEqual(response.status_code, 200)
        returned_ids = {row['id'] for row in response.data['results']}
        self.assertEqual(returned_ids, {self.active_supplier_booking.id})

    def test_inactive_supplier_is_denied(self):
        response = self._get(self.inactive_supplier_user)
        self.assertIn(response.status_code, (401, 403))

    def test_super_admin_sees_full_queryset(self):
        response = self._get(self.super_admin)

        self.assertEqual(response.status_code, 200)
        returned_ids = {row['id'] for row in response.data['results']}
        self.assertEqual(
            returned_ids,
            {
                self.super_admin_booking.id,
                self.pending_booking.id,
                self.payment_failed_booking.id,
                self.active_supplier_booking.id,
                self.other_supplier_booking.id,
            },
        )

    def test_supplier_cannot_bypass_scope_with_query_parameters(self):
        response = self._get(
            self.active_supplier_user,
            {'supplier': str(self.other_supplier.id)},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('supplier', response.data)

    def test_search_matches_booking_id_registration_phone_and_text_fields(self):
        response = self._get(self.super_admin, {'search': '261D1234'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row['id'] for row in response.data['results']], [self.super_admin_booking.id])

        response = self._get(self.super_admin, {'search': 'RSBOOK001'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row['id'] for row in response.data['results']], [self.super_admin_booking.id])

        response = self._get(self.super_admin, {'search': 'Alice'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row['id'] for row in response.data['results']], [self.super_admin_booking.id])

        response = self._get(self.super_admin, {'search': '087 123 4567'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row['id'] for row in response.data['results']], [self.super_admin_booking.id])

    def test_important_filters_work(self):
        date_from = (self.super_admin_booking.departure_time.date() - timedelta(days=1)).isoformat()
        date_to = (self.super_admin_booking.departure_time.date() + timedelta(days=1)).isoformat()

        response = self._get(self.super_admin, {'departure_date_from': date_from, 'departure_date_to': date_to})
        self.assertEqual(response.status_code, 200)
        self.assertIn(self.super_admin_booking.id, {row['id'] for row in response.data['results']})

        response = self._get(self.super_admin, {'return_date_from': date_from, 'return_date_to': date_to})
        self.assertEqual(response.status_code, 200)
        self.assertIn(self.super_admin_booking.id, {row['id'] for row in response.data['results']})

        created_from = (self.super_admin_booking.created_at.date() - timedelta(days=1)).isoformat()
        created_to = (self.super_admin_booking.created_at.date() + timedelta(days=1)).isoformat()
        response = self._get(self.super_admin, {'created_date_from': created_from, 'created_date_to': created_to})
        self.assertEqual(response.status_code, 200)
        self.assertIn(self.super_admin_booking.id, {row['id'] for row in response.data['results']})

        response = self._get(self.super_admin, {'status': str(self.confirmed_status.id)})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {row['id'] for row in response.data['results']},
            {self.super_admin_booking.id, self.active_supplier_booking.id, self.other_supplier_booking.id},
        )

        response = self._get(self.super_admin, {'service': str(self.service_b.id)})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {row['id'] for row in response.data['results']},
            {self.payment_failed_booking.id, self.other_supplier_booking.id},
        )

        response = self._get(self.super_admin, {'website': 'rsexpressparking'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {row['id'] for row in response.data['results']},
            {self.super_admin_booking.id, self.pending_booking.id},
        )

        response = self._get(self.super_admin, {'supplier': 'all_suppliers'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {row['id'] for row in response.data['results']},
            {self.active_supplier_booking.id, self.other_supplier_booking.id},
        )

        response = self._get(self.super_admin, {'source': 'Direct'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {row['id'] for row in response.data['results']},
            {self.pending_booking.id, self.other_supplier_booking.id},
        )

    def test_pagination_is_bounded(self):
        response = self._get(self.super_admin, {'page_size': '1', 'ordering': 'created_at'})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 5)
        self.assertEqual(len(response.data['results']), 1)
        self.assertIsNotNone(response.data['next'])
        self.assertIsNone(response.data['previous'])

    def test_page_sized_list_uses_a_bounded_query_count(self):
        """A normal 20-row page must not perform one query per booking."""
        for index in range(25):
            self._create_booking(
                booking_id=f'PERF-{index:03d}',
                email=f'performance-{index}@example.com',
                contact_no=f'+3538712{index:05d}',
                status=self.confirmed_status,
            )

        # Count, one select_related list query, and one add-on prefetch query.
        with self.assertNumQueries(3):
            response = self._get(self.super_admin, {'page_size': '20'})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 20)
        self.assertEqual(response.data['count'], 30)

    def test_allowed_and_disallowed_ordering(self):
        response = self._get(self.super_admin, {'ordering': 'booking_id'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [row['booking_id'] for row in response.data['results']],
            [
                self.active_supplier_booking.booking_id,
                self.other_supplier_booking.booking_id,
                self.super_admin_booking.booking_id,
                self.pending_booking.booking_id,
                self.payment_failed_booking.booking_id,
            ],
        )

        response = self._get(self.super_admin, {'ordering': 'note'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('ordering', response.data)

    def test_sensitive_fields_are_not_exposed(self):
        response = self._get(self.super_admin)

        self.assertEqual(response.status_code, 200)
        row = response.data['results'][0]
        for field_name in (
            'email',
            'utm_source',
            'utm_medium',
            'utm_campaign',
            'contact_no_normalized',
            'customer_experience',
            'customer_experience_details',
            'supplier_extended_amount',
            'submission_key',
            'submission_fingerprint',
        ):
            self.assertNotIn(field_name, row)

        self.assertIn('price', row)
        self.assertIn('source', row)
        self.assertIn('website', row)


class StaffBookingDetailAPITests(StaffBookingListAPITests):
    """Authorization and field-safety coverage for the staff detail contract."""

    def setUp(self):
        super().setUp()

    def _detail_url(self, booking):
        return f'/api/bookings/staff/{booking.id}/'

    def _get_detail(self, user, booking):
        self.client.force_authenticate(user=user)
        return self.client.get(self._detail_url(booking))

    def _patch_detail(self, user, booking, payload):
        self.client.force_authenticate(user=user)
        return self.client.patch(self._detail_url(booking), payload, format='json')

    def _document_url(self, booking, document_type):
        return f'/api/bookings/staff/{booking.id}/documents/{document_type}/'

    def _status_action_url(self, booking):
        return f'/api/bookings/staff/{booking.id}/actions/status/'

    def _post_status_action(self, user, booking, status_id):
        self.client.force_authenticate(user=user)
        return self.client.post(self._status_action_url(booking), {'status': status_id}, format='json')

    def _notify_url(self, booking):
        return f'/api/bookings/staff/{booking.id}/actions/save-and-notify/'

    def _post_save_and_notify(self, user, booking, payload):
        self.client.force_authenticate(user=user)
        return self.client.post(self._notify_url(booking), payload, format='json')

    def test_anonymous_and_customer_are_denied(self):
        anonymous_response = self.client.get(self._detail_url(self.super_admin_booking))
        self.assertIn(anonymous_response.status_code, (401, 403))

        customer_response = self._get_detail(self.customer, self.super_admin_booking)
        self.assertIn(customer_response.status_code, (401, 403))

    def test_super_admin_can_read_detail_and_opening_marks_booking_viewed(self):
        self.assertFalse(self.super_admin_booking.is_viewed)

        response = self._get_detail(self.super_admin, self.super_admin_booking)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['customer']['email'], 'alice@example.com')
        self.assertIn('pricing', response.data)
        self.assertIn('marketing_attribution', response.data)
        self.super_admin_booking.refresh_from_db()
        self.assertTrue(self.super_admin_booking.is_viewed)

    def test_manager_cannot_read_pending_booking_or_pricing_and_marketing(self):
        hidden_response = self._get_detail(self.manager, self.pending_booking)
        self.assertEqual(hidden_response.status_code, 404)

        response = self._get_detail(self.manager, self.super_admin_booking)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('pricing', response.data)
        self.assertNotIn('supplier', response.data)
        self.assertNotIn('marketing_attribution', response.data)

    def test_supplier_can_read_only_own_detail_with_supplier_safe_price(self):
        own_response = self._get_detail(self.active_supplier_user, self.active_supplier_booking)
        self.assertEqual(own_response.status_code, 200)
        self.assertEqual(own_response.data['pricing']['total'], '140.00')
        self.assertNotIn('supplier', own_response.data)
        self.assertNotIn('marketing_attribution', own_response.data)

        other_response = self._get_detail(self.active_supplier_user, self.other_supplier_booking)
        self.assertEqual(other_response.status_code, 404)

    def test_inactive_supplier_is_denied(self):
        response = self._get_detail(self.inactive_supplier_user, self.active_supplier_booking)
        self.assertIn(response.status_code, (401, 403))

    def test_manager_can_update_operational_fields_but_not_pricing_or_marketing(self):
        response = self._patch_detail(self.manager, self.super_admin_booking, {
            'note': 'Customer called to confirm flight details.',
            'customer_experience': Booking.CustomerExperience.GOOD,
        })
        self.assertEqual(response.status_code, 200)
        self.super_admin_booking.refresh_from_db()
        self.assertEqual(self.super_admin_booking.note, 'Customer called to confirm flight details.')
        self.assertEqual(self.super_admin_booking.customer_experience, Booking.CustomerExperience.GOOD)

        pricing_response = self._patch_detail(self.manager, self.super_admin_booking, {'total_price': '1.00'})
        self.assertEqual(pricing_response.status_code, 400)
        self.assertIn('total_price', pricing_response.data)

        marketing_response = self._patch_detail(self.manager, self.super_admin_booking, {'utm_source': 'manual'})
        self.assertEqual(marketing_response.status_code, 400)
        self.assertIn('utm_source', marketing_response.data)

    def test_supplier_can_update_own_permitted_fields_but_not_protected_fields(self):
        response = self._patch_detail(self.active_supplier_user, self.active_supplier_booking, {
            'total_price': '150.00',
            'note': 'Supplier operational note.',
        })
        self.assertEqual(response.status_code, 200)
        self.active_supplier_booking.refresh_from_db()
        self.assertEqual(self.active_supplier_booking.total_price, Decimal('150.00'))

        protected_response = self._patch_detail(self.active_supplier_user, self.active_supplier_booking, {
            'customer_experience': Booking.CustomerExperience.BAD,
            'supplier_extended_amount': '20.00',
        })
        self.assertEqual(protected_response.status_code, 400)
        self.assertIn('customer_experience', protected_response.data)
        self.assertIn('supplier_extended_amount', protected_response.data)

        other_response = self._patch_detail(self.active_supplier_user, self.other_supplier_booking, {'note': 'Nope'})
        self.assertEqual(other_response.status_code, 404)

    def test_super_admin_can_update_extension_and_invalid_input_is_rejected(self):
        success_response = self._patch_detail(self.super_admin, self.active_supplier_booking, {
            'supplier_extended_amount': '25.00',
        })
        self.assertEqual(success_response.status_code, 200)
        self.active_supplier_booking.refresh_from_db()
        self.assertEqual(self.active_supplier_booking.supplier_extended_amount, Decimal('25.00'))

        invalid_dates_response = self._patch_detail(self.super_admin, self.super_admin_booking, {
            'return_time': self.super_admin_booking.departure_time.isoformat(),
        })
        self.assertEqual(invalid_dates_response.status_code, 400)
        self.assertIn('return_time', invalid_dates_response.data)

        invalid_status_response = self._patch_detail(self.super_admin, self.super_admin_booking, {'status': 999999})
        self.assertEqual(invalid_status_response.status_code, 400)
        self.assertIn('status', invalid_status_response.data)

        invalid_price_response = self._patch_detail(self.super_admin, self.super_admin_booking, {'total_price': '-1.00'})
        self.assertEqual(invalid_price_response.status_code, 400)
        self.assertIn('total_price', invalid_price_response.data)

        invalid_service_response = self._patch_detail(self.super_admin, self.super_admin_booking, {'service': 999999})
        self.assertEqual(invalid_service_response.status_code, 400)
        self.assertIn('service', invalid_service_response.data)

        invalid_add_on_response = self._patch_detail(self.super_admin, self.super_admin_booking, {'add_ons': [999999]})
        self.assertEqual(invalid_add_on_response.status_code, 400)
        self.assertIn('add_ons', invalid_add_on_response.data)

    @patch('bookings.views.generate_invoice')
    @patch('bookings.views.generate_booking_form_pdf')
    def test_staff_document_access_is_role_scoped(self, mock_booking_form, mock_invoice):
        mock_invoice.return_value = (HttpResponse(b'invoice', content_type='application/pdf'), None)
        mock_booking_form.return_value = (HttpResponse(b'booking form', content_type='application/pdf'), None)

        anonymous = self.client.get(self._document_url(self.super_admin_booking, 'invoice'))
        self.assertIn(anonymous.status_code, (401, 403))

        self.client.force_authenticate(user=self.customer)
        customer = self.client.get(self._document_url(self.super_admin_booking, 'booking-form'))
        self.assertIn(customer.status_code, (401, 403))

        self.client.force_authenticate(user=self.manager)
        manager_invoice = self.client.get(self._document_url(self.super_admin_booking, 'invoice'))
        self.assertEqual(manager_invoice.status_code, 403)
        manager_form = self.client.get(self._document_url(self.super_admin_booking, 'booking-form'))
        self.assertEqual(manager_form.status_code, 200)

        self.client.force_authenticate(user=self.active_supplier_user)
        supplier_own_invoice = self.client.get(self._document_url(self.active_supplier_booking, 'invoice'))
        self.assertEqual(supplier_own_invoice.status_code, 200)
        supplier_other_form = self.client.get(self._document_url(self.other_supplier_booking, 'booking-form'))
        self.assertEqual(supplier_other_form.status_code, 404)

        self.client.force_authenticate(user=self.super_admin)
        full_admin_invoice = self.client.get(self._document_url(self.super_admin_booking, 'invoice'))
        self.assertEqual(full_admin_invoice.status_code, 200)
        self.assertIn('attachment;', full_admin_invoice['Content-Disposition'])

    @patch('bookings.views.logger')
    @patch('bookings.views.generate_invoice')
    def test_document_generation_failure_uses_safe_log_metadata(self, generate_invoice, logger):
        generate_invoice.return_value = (None, 'customer@example.com token=secret')
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.get(self._document_url(self.super_admin_booking, 'invoice'))

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data['detail'], 'Unable to generate this document.')
        logger.error.assert_called_once_with(
            'Staff document generation failed: document_type=%s booking_id=%s',
            'invoice',
            self.super_admin_booking.pk,
        )

    def test_status_action_is_allow_listed_and_role_scoped(self):
        completed = Status.objects.create(name='Completed', type='booking')

        manager_response = self._post_status_action(self.manager, self.super_admin_booking, completed.id)
        self.assertEqual(manager_response.status_code, 200)
        self.super_admin_booking.refresh_from_db()
        self.assertEqual(self.super_admin_booking.status, completed)

        disallowed_response = self._post_status_action(self.manager, self.super_admin_booking, self.pending_status.id)
        self.assertEqual(disallowed_response.status_code, 400)
        self.assertIn('status', disallowed_response.data)

        hidden_response = self._post_status_action(self.manager, self.pending_booking, completed.id)
        self.assertEqual(hidden_response.status_code, 404)

        supplier_response = self._post_status_action(self.active_supplier_user, self.active_supplier_booking, completed.id)
        self.assertEqual(supplier_response.status_code, 200)
        supplier_other = self._post_status_action(self.active_supplier_user, self.other_supplier_booking, completed.id)
        self.assertEqual(supplier_other.status_code, 404)

    @patch('bookings.views.send_booking_updated_email.delay')
    def test_save_and_notify_queues_customer_safe_changed_field_summary(self, mock_delay):
        response = self._post_save_and_notify(self.super_admin, self.super_admin_booking, {
            'departure_terminal': 'T2',
            'total_price': '130.00',
            'note': 'Internal-only note',
            'customer_experience': Booking.CustomerExperience.GOOD,
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['notification']['status'], 'queued')
        self.assertEqual(response.data['notification']['type'], 'update')
        mock_delay.assert_called_once()
        _, changes = mock_delay.call_args.args
        self.assertEqual(mock_delay.call_args.args[0], self.super_admin_booking.id)
        labels = {change['label'] for change in changes}
        self.assertEqual(labels, {'Departure terminal', 'Total price'})
        departure_change = next(change for change in changes if change['label'] == 'Departure terminal')
        self.assertEqual(departure_change['old'], 'T1')
        self.assertEqual(departure_change['new'], 'T2')

    @patch('bookings.views.send_booking_updated_email.delay')
    @patch('bookings.views.send_cancellation_email_task.delay')
    def test_save_and_notify_cancellation_uses_cancellation_notification(self, mock_cancellation_delay, mock_update_delay):
        response = self._post_save_and_notify(self.super_admin, self.super_admin_booking, {
            'status': self.cancelled_status.id,
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['notification']['type'], 'cancellation')
        mock_cancellation_delay.assert_called_once_with(
            self.super_admin_booking.id,
            'admin_cancelled',
        )
        mock_update_delay.assert_not_called()

    @patch('bookings.views.send_booking_updated_email.delay')
    def test_unauthorized_or_out_of_scope_users_cannot_send_customer_notifications(self, mock_delay):
        anonymous_response = self.client.post(
            self._notify_url(self.super_admin_booking),
            {'departure_terminal': 'T2'},
            format='json',
        )
        self.assertIn(anonymous_response.status_code, (401, 403))

        customer_response = self._post_save_and_notify(self.customer, self.super_admin_booking, {'departure_terminal': 'T2'})
        self.assertIn(customer_response.status_code, (401, 403))

        supplier_response = self._post_save_and_notify(
            self.active_supplier_user,
            self.other_supplier_booking,
            {'departure_terminal': 'T2'},
        )
        self.assertEqual(supplier_response.status_code, 404)
        mock_delay.assert_not_called()

    @patch('bookings.views.send_booking_updated_email')
    def test_save_and_notify_falls_back_to_inline_delivery_when_celery_is_unavailable(self, mock_task):
        mock_task.delay.side_effect = RuntimeError('broker unavailable')

        response = self._post_save_and_notify(self.super_admin, self.super_admin_booking, {
            'departure_terminal': 'T2',
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['notification']['status'], 'sent')
        mock_task.assert_called_once()

    @patch('bookings.views.logger')
    @patch('bookings.views.send_booking_updated_email')
    def test_save_and_notify_reports_delivery_failure_without_logging_provider_details(self, mock_task, logger):
        mock_task.delay.side_effect = RuntimeError('customer@example.com token=secret')
        mock_task.side_effect = RuntimeError('customer@example.com token=secret')

        response = self._post_save_and_notify(self.super_admin, self.super_admin_booking, {
            'departure_terminal': 'T2',
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['notification']['status'], 'failed')
        self.assertEqual(response.data['notification']['type'], 'update')
        logger.error.assert_called_once_with(
            'Staff notification failed: booking_id=%s notification_type=%s',
            self.super_admin_booking.pk,
            'update',
        )


class StaffBookingCreateAPITests(StaffBookingListAPITests):
    """Focused coverage for the Chunk 8 staff creation contract."""

    def setUp(self):
        super().setUp()
        self.url = '/api/bookings/staff/create/'

    def _payload(self, **overrides):
        payload = {
            'service': self.service_a.id,
            'status': self.confirmed_status.id,
            'website': 'rsexpressparking',
            'first_name': 'New',
            'last_name': 'Booking',
            'email': 'new.booking@example.com',
            'contact_no': '+353871234567',
            'total_passengers': 2,
            'car_registration_no': '241 D 1234',
            'car_model': 'Corolla',
            'car_colour': 'Silver',
            'car_manufacturer': 'Toyota',
            'departure_terminal': 'T1',
            'return_terminal': 'T2',
            'departure_time': (timezone.now() + timedelta(days=10)).isoformat(),
            'return_time': (timezone.now() + timedelta(days=12)).isoformat(),
            'total_price': '120.00',
            'discounted_price': '120.00',
            'add_ons': [],
        }
        payload.update(overrides)
        return payload

    def _post(self, user, payload):
        self.client.force_authenticate(user=user)
        return self.client.post(self.url, payload, format='json')

    def test_anonymous_and_customer_cannot_create_staff_bookings(self):
        anonymous_response = self.client.post(self.url, self._payload(), format='json')
        self.assertIn(anonymous_response.status_code, (401, 403))

        customer_response = self._post(self.customer, self._payload())
        self.assertIn(customer_response.status_code, (401, 403))

    @patch('bookings.views.send_manager_new_booking_email')
    @patch('bookings.views.send_booking_confirmation_email', return_value=b'invoice-bytes')
    def test_full_admin_creation_generates_rs_and_dublin_ids_and_notifies_confirmed_customer(
        self, confirmation_email, manager_email,
    ):
        rs_response = self._post(self.super_admin, self._payload())
        self.assertEqual(rs_response.status_code, 201)
        rs_booking = Booking.objects.get(pk=rs_response.data['id'])
        self.assertTrue(rs_booking.booking_id.startswith('RS-'))

        dublin_response = self._post(self.super_admin, self._payload(
            service=self.service_b.id,
            website='dublinairportparking',
            email='dublin.booking@example.com',
        ))
        self.assertEqual(dublin_response.status_code, 201)
        dublin_booking = Booking.objects.get(pk=dublin_response.data['id'])
        self.assertTrue(dublin_booking.booking_id.startswith('DA-'))
        self.assertEqual(confirmation_email.call_count, 2)
        self.assertEqual(manager_email.call_count, 2)

    def test_manager_can_create_visible_status_but_not_hidden_status(self):
        visible_response = self._post(self.manager, self._payload())
        self.assertEqual(visible_response.status_code, 201)

        hidden_response = self._post(self.manager, self._payload(status=self.pending_status.id))
        self.assertEqual(hidden_response.status_code, 400)
        self.assertIn('status', hidden_response.data)

    @patch('bookings.views.send_supplier_booking_manager_notification.delay')
    def test_supplier_is_forced_to_own_profile_and_receives_generated_supplier_id(self, notification_delay):
        response = self._post(self.active_supplier_user, self._payload(
            status=None,
            supplier=self.other_supplier.id,
            email='supplier.created@example.com',
        ))

        self.assertEqual(response.status_code, 201)
        booking = Booking.objects.get(pk=response.data['id'])
        self.assertEqual(booking.supplier, self.active_supplier)
        self.assertTrue(booking.booking_id.startswith('ACT-'))
        notification_delay.assert_called_once_with(booking.id)

    def test_supplier_custom_booking_id_is_required_and_preserved(self):
        self.active_supplier.use_custom_booking_ids = True
        self.active_supplier.save(update_fields=['use_custom_booking_ids'])

        missing_id = self._post(self.active_supplier_user, self._payload(status=None))
        self.assertEqual(missing_id.status_code, 400)
        self.assertIn('booking_id', missing_id.data)

        supplied_id = self._post(self.active_supplier_user, self._payload(
            status=None,
            booking_id='ACT-MANUAL-901',
            email='supplier.custom@example.com',
        ))
        self.assertEqual(supplied_id.status_code, 201)
        self.assertEqual(Booking.objects.get(pk=supplied_id.data['id']).booking_id, 'ACT-MANUAL-901')

    def test_invalid_dates_service_and_status_are_rejected(self):
        invalid_dates = self._post(self.super_admin, self._payload(
            return_time=(timezone.now() + timedelta(days=9)).isoformat(),
        ))
        self.assertEqual(invalid_dates.status_code, 400)
        self.assertIn('return_time', invalid_dates.data)

        disabled_service = Service.objects.create(
            name='Disabled service', description='Short description', long_description='Long description',
            base_price=Decimal('10.00'), per_day_price=Decimal('1.00'), enabled=False,
        )
        invalid_service = self._post(self.super_admin, self._payload(service=disabled_service.id))
        self.assertEqual(invalid_service.status_code, 400)
        self.assertIn('service', invalid_service.data)

        invalid_status = self._post(self.super_admin, self._payload(status=999999))
        self.assertEqual(invalid_status.status_code, 400)
        self.assertIn('status', invalid_status.data)


class StaffBookingBulkActionAPITests(StaffBookingListAPITests):
    """Selected-ID export coverage for the Chunk 9 staff contract."""

    def setUp(self):
        super().setUp()
        self.url = '/api/bookings/staff/bulk/xlsx/'

    def _post(self, user, action='xlsx', ids=None, **payload):
        self.client.force_authenticate(user=user)
        return self.client.post(
            f'/api/bookings/staff/bulk/{action}/',
            {'ids': ids if ids is not None else [self.super_admin_booking.id], **payload},
            format='json',
        )

    @patch('bookings.views.BookingAdmin.export_as_csv')
    def test_full_admin_exports_only_the_selected_ids_with_admin_date_filters(self, export):
        export.return_value = HttpResponse(
            b'xlsx',
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={'Content-Disposition': 'attachment; filename="Selected_Bookings.xlsx"'},
        )
        response = self._post(
            self.super_admin,
            ids=[self.super_admin_booking.id, self.active_supplier_booking.id],
            departure_date_from='2030-01-02',
            departure_date_to='2030-01-04',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        self.assertIn('Selected_Bookings.xlsx', response['Content-Disposition'])
        admin_request, selected_queryset = export.call_args.args
        self.assertEqual(set(selected_queryset.values_list('pk', flat=True)), {
            self.super_admin_booking.id, self.active_supplier_booking.id,
        })
        self.assertEqual(admin_request.GET['departure_time__gte'], '2030-01-02')
        self.assertEqual(admin_request.GET['departure_time__lt'], '2030-01-04')

    @patch('bookings.views.BookingAdmin.download_invoices_zip')
    def test_supplier_cannot_export_another_supplier_booking(self, export):
        response = self._post(
            self.active_supplier_user,
            action='invoice-zip',
            ids=[self.active_supplier_booking.id, self.other_supplier_booking.id],
        )

        self.assertEqual(response.status_code, 404)
        export.assert_not_called()

    @patch('bookings.views.BookingAdmin.download_invoices_zip')
    def test_supplier_can_download_its_own_invoice_zip(self, export):
        export.return_value = HttpResponse(
            b'zip', content_type='application/zip',
            headers={'Content-Disposition': 'attachment; filename="invoices_01-01-2030.zip"'},
        )
        response = self._post(
            self.active_supplier_user,
            action='invoice-zip',
            ids=[self.active_supplier_booking.id],
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/zip')
        export.assert_called_once()

        capability_response = self._get(self.active_supplier_user)
        self.assertTrue(capability_response.data['bulk_actions']['invoice_zip'])

    def test_manager_does_not_receive_invoice_zip_capability_or_access(self):
        response = self._get(self.manager)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['bulk_actions']['invoice_zip'])

        action_response = self._post(self.manager, action='invoice-zip')
        self.assertEqual(action_response.status_code, 403)

    @patch('bookings.views.BookingAdmin.download_booking_forms_zip')
    def test_manager_can_download_booking_forms(self, export):
        export.return_value = HttpResponse(
            b'zip', content_type='application/zip',
            headers={'Content-Disposition': 'attachment; filename="booking_forms_01-01-2030.zip"'},
        )
        response = self._post(self.manager, action='booking-form-zip')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/zip')
        self.assertIn('.zip', response['Content-Disposition'])
        export.assert_called_once()

    def test_empty_invalid_and_unauthorized_requests_are_rejected(self):
        anonymous = self.client.post(self.url, {'ids': [self.super_admin_booking.id]}, format='json')
        self.assertIn(anonymous.status_code, (401, 403))

        customer = self._post(self.customer)
        self.assertIn(customer.status_code, (401, 403))

        empty = self._post(self.super_admin, ids=[])
        self.assertEqual(empty.status_code, 400)
        self.assertIn('ids', empty.data)

        invalid_date_range = self._post(
            self.super_admin,
            departure_date_from='2030-01-05',
            departure_date_to='2030-01-04',
        )
        self.assertEqual(invalid_date_range.status_code, 400)
        self.assertIn('departure_date_to', invalid_date_range.data)

        too_many = self._post(self.super_admin, ids=[self.super_admin_booking.id] * 101)
        self.assertEqual(too_many.status_code, 400)
        self.assertIn('ids', too_many.data)

    @patch('bookings.views.logger')
    @patch('bookings.views.BookingAdmin.export_as_csv', side_effect=RuntimeError('customer@example.com token=secret'))
    def test_bulk_export_failure_logs_only_safe_operational_metadata(self, _export, logger):
        response = self._post(self.super_admin, action='xlsx')

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data['detail'], 'Unable to prepare this bulk download.')
        logger.error.assert_called_once_with(
            'Staff bulk booking action failed: action=%s actor_id=%s selected_count=%s',
            'xlsx',
            self.super_admin.pk,
            1,
        )


class PhoneNormalizationTests(SimpleTestCase):
    def test_common_irish_phone_formats_normalize_to_the_same_value(self):
        expected = '353871234567'

        self.assertEqual(normalize_phone_number('+353 87 123 4567'), expected)
        self.assertEqual(normalize_phone_number('00353 (87) 123-4567'), expected)
        self.assertEqual(normalize_phone_number('087 123 4567'), expected)
        self.assertEqual(normalize_phone_number('+353 (0)87 123 4567'), expected)

    def test_empty_phone_normalizes_to_none(self):
        self.assertIsNone(normalize_phone_number(None))
        self.assertIsNone(normalize_phone_number(''))


class CustomerExperienceHistoryTests(TestCase):
    def setUp(self):
        self.service = Service.objects.create(
            name='Experience Test Service',
            description='Short description',
            long_description='Long description',
            base_price=Decimal('50.00'),
            per_day_price=Decimal('10.00'),
            enabled=True,
            website='both',
        )
        self.supplier = Supplier.objects.create(
            name='Experience Supplier',
            booking_id_prefix='EXP',
        )
        self.user = get_user_model().objects.create_user(
            username='returning-customer',
            email='account@example.com',
        )
        self.current_departure = datetime(2026, 8, 1, 9, tzinfo=dt_timezone.utc)

    def booking(self, **overrides):
        sequence = Booking.objects.count() + 1
        data = {
            'service': self.service,
            'first_name': 'Test',
            'last_name': 'Customer',
            'email': f'customer-{sequence}@example.com',
            'contact_no': f'+35387123{sequence:04d}',
            'total_passengers': 1,
            'car_registration_no': f'261-D-{sequence}',
            'car_model': 'Corolla',
            'car_colour': 'Silver',
            'car_manufacturer': 'Toyota',
            'departure_terminal': 'T1',
            'return_terminal': 'T1',
            'departure_time': self.current_departure - timedelta(days=10),
            'return_time': self.current_departure - timedelta(days=8),
            'total_price': Decimal('120.00'),
            'discounted_price': Decimal('120.00'),
        }
        data.update(overrides)
        return Booking.objects.create(**data)

    def test_good_bad_and_unreviewed_states_are_available(self):
        self.assertEqual(
            list(Booking.CustomerExperience.values),
            ['good', 'bad'],
        )
        booking = self.booking()
        self.assertIsNone(booking.customer_experience)
        self.assertIsNone(booking.customer_experience_details)

    def test_matches_by_user_email_or_normalized_phone(self):
        by_user = self.booking(
            user=self.user,
            customer_experience=Booking.CustomerExperience.GOOD,
            customer_experience_details='Account match',
            return_time=self.current_departure - timedelta(days=6),
        )
        current_user_booking = self.booking(
            user=self.user,
            departure_time=self.current_departure,
            return_time=self.current_departure + timedelta(days=2),
        )
        self.assertEqual(current_user_booking.get_previous_customer_experience(), by_user)

        by_email = self.booking(
            email='Case.Match@Example.com',
            customer_experience=Booking.CustomerExperience.BAD,
            return_time=self.current_departure - timedelta(days=5),
        )
        current_email_booking = self.booking(
            email='case.match@example.com',
            departure_time=self.current_departure,
            return_time=self.current_departure + timedelta(days=2),
        )
        self.assertEqual(current_email_booking.get_previous_customer_experience(), by_email)

        by_phone = self.booking(
            contact_no='087 555 0199',
            customer_experience=Booking.CustomerExperience.GOOD,
            return_time=self.current_departure - timedelta(days=4),
        )
        current_phone_booking = self.booking(
            contact_no='+353 (87) 555-0199',
            departure_time=self.current_departure,
            return_time=self.current_departure + timedelta(days=2),
        )
        self.assertEqual(current_phone_booking.get_previous_customer_experience(), by_phone)

    def test_latest_eligible_review_wins_and_ineligible_bookings_are_ignored(self):
        shared_email = 'history@example.com'
        self.booking(
            email=shared_email,
            customer_experience=Booking.CustomerExperience.BAD,
            return_time=self.current_departure - timedelta(days=20),
        )
        expected = self.booking(
            email=shared_email,
            customer_experience=Booking.CustomerExperience.GOOD,
            customer_experience_details='Most recent ended trip',
            return_time=self.current_departure - timedelta(days=2),
        )
        self.booking(
            email=shared_email,
            return_time=self.current_departure - timedelta(days=1),
        )
        self.booking(
            email=shared_email,
            customer_experience=Booking.CustomerExperience.BAD,
            departure_time=self.current_departure - timedelta(hours=2),
            return_time=self.current_departure + timedelta(hours=2),
        )
        current = self.booking(
            email=shared_email,
            departure_time=self.current_departure,
            return_time=self.current_departure + timedelta(days=3),
        )

        self.assertEqual(current.get_previous_customer_experience(), expected)

    def test_history_crosses_brand_and_supplier_boundaries(self):
        previous = self.booking(
            email='cross-brand@example.com',
            website='dublinairportparking',
            supplier=self.supplier,
            customer_experience=Booking.CustomerExperience.BAD,
            customer_experience_details='Supplier-recorded trip',
        )
        current = self.booking(
            email='cross-brand@example.com',
            website='rsexpressparking',
            departure_time=self.current_departure,
            return_time=self.current_departure + timedelta(days=2),
        )

        self.assertEqual(current.get_previous_customer_experience(), previous)

    def test_customer_serializer_cannot_write_or_reveal_internal_fields(self):
        booking = self.booking(
            departure_time=self.current_departure,
            return_time=self.current_departure + timedelta(days=2),
        )
        serializer = BookingSerializer(
            booking,
            data={
                'customer_experience': Booking.CustomerExperience.BAD,
                'customer_experience_details': 'Attempted public update',
                'contact_no_normalized': '123',
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        booking.refresh_from_db()
        self.assertIsNone(booking.customer_experience)
        self.assertIsNone(booking.customer_experience_details)

        response_data = BookingSerializer(booking).data
        self.assertNotIn('customer_experience', response_data)
        self.assertNotIn('customer_experience_details', response_data)
        self.assertNotIn('contact_no_normalized', response_data)

    def test_admin_permissions_and_previous_experience_display(self):
        previous = self.booking(
            email='admin-display@example.com',
            customer_experience=Booking.CustomerExperience.BAD,
            customer_experience_details='Needs extra patience',
        )
        current = self.booking(
            email='admin-display@example.com',
            departure_time=self.current_departure,
            return_time=self.current_departure + timedelta(days=2),
        )
        booking_admin = BookingAdmin(Booking, admin.site)
        request = RequestFactory().get('/admin/bookings/booking/')

        request.user = SimpleNamespace(is_supplier=False)
        manager_readonly = booking_admin.get_readonly_fields(request, current)
        self.assertNotIn('customer_experience', manager_readonly)
        self.assertNotIn('customer_experience_details', manager_readonly)

        request.user = SimpleNamespace(is_supplier=True)
        supplier_readonly = booking_admin.get_readonly_fields(request, current)
        self.assertIn('customer_experience', supplier_readonly)
        self.assertIn('customer_experience_details', supplier_readonly)

        display = strip_tags(str(booking_admin.previous_customer_experience_display(current)))
        self.assertIn('Bad', display)
        self.assertIn(previous.booking_id, display)
        self.assertIn('Needs extra patience', display)

    def test_driver_form_renders_previous_experience_and_empty_state(self):
        previous = self.booking(
            email='driver-form@example.com',
            customer_experience=Booking.CustomerExperience.GOOD,
            customer_experience_details='Friendly returning customer',
        )
        current = self.booking(
            email='driver-form@example.com',
            departure_time=self.current_departure,
            return_time=self.current_departure + timedelta(days=2),
        )
        html = render_to_string('payments/invoice_manager.html', {
            'booking': current,
            'add_ons': [],
            'image_data': None,
            'previous_experience': current.get_previous_customer_experience(),
        })

        self.assertIn('Previous Customer Experience', html)
        self.assertIn('Friendly returning customer', html)
        self.assertNotIn('Previous Booking:', html)

        no_history = self.booking(
            departure_time=self.current_departure,
            return_time=self.current_departure + timedelta(days=2),
        )
        empty_html = render_to_string('payments/invoice_manager.html', {
            'booking': no_history,
            'add_ons': [],
            'image_data': None,
            'previous_experience': no_history.get_previous_customer_experience(),
        })
        self.assertIn('No prior reviewed experience.', empty_html)
