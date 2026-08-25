from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal
from types import SimpleNamespace
import uuid

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase, TransactionTestCase
from django.test.client import Client, RequestFactory
from django.template.loader import render_to_string
from django.urls import resolve
from django.utils.html import strip_tags
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
