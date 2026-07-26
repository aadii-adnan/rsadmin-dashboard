from datetime import datetime, timezone as dt_timezone
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from core.models import Status
from services.models import Service

from .booking_rules import get_cancellation_policy, validate_reschedule
from .guest_views import _manage_flags
from .models import Booking
from .views import ManagerBookingStatusUpdate


class MissedPickupBookingRuleTests(TestCase):
    def setUp(self):
        service = Service.objects.create(
            name='Missed Pickup Test Service',
            description='Short description',
            long_description='Long description',
            base_price=Decimal('50.00'),
            per_day_price=Decimal('10.00'),
            enabled=True,
            website='rsexpressparking',
        )
        missed_pickup_status, _ = Status.objects.get_or_create(
            name='Missed Pickup',
            type='booking',
        )
        self.booking = Booking.objects.create(
            service=service,
            first_name='Missed',
            last_name='Pickup',
            email='missed.pickup@example.com',
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
            status=missed_pickup_status,
        )
        self.now = datetime(2026, 7, 1, tzinfo=dt_timezone.utc)

    def test_missed_pickup_is_a_terminal_status(self):
        policy = get_cancellation_policy(self.booking, now=self.now)
        flags = _manage_flags(self.booking, now=self.now)

        self.assertFalse(policy['allowed'])
        self.assertFalse(policy['refund_eligible'])
        self.assertFalse(flags['can_cancel'])
        self.assertFalse(flags['can_reschedule'])
        self.assertTrue(flags['departure_locked'])
        self.assertTrue(flags['return_locked'])

    def test_missed_pickup_booking_cannot_be_rescheduled(self):
        error = validate_reschedule(
            self.booking,
            datetime(2026, 8, 2, 5, tzinfo=dt_timezone.utc),
            datetime(2026, 8, 9, 17, tzinfo=dt_timezone.utc),
            now=self.now,
        )

        self.assertEqual(error, 'Cannot reschedule this booking.')

    def test_manager_can_mark_a_booking_as_missed_pickup(self):
        confirmed_status, _ = Status.objects.get_or_create(
            name='Confirmed',
            type='booking',
        )
        self.booking.status = confirmed_status
        self.booking.save(update_fields=['status'])
        manager = get_user_model().objects.create_user(
            username='missed-pickup-manager',
            password='test-password',
            is_manager=True,
        )
        request = APIRequestFactory().post(
            '/bookings/manager/status/',
            {'status': 'Missed Pickup'},
            format='json',
        )
        force_authenticate(request, user=manager)

        response = ManagerBookingStatusUpdate.as_view()(request, pk=self.booking.pk)

        self.assertEqual(response.status_code, 200)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status.name, 'Missed Pickup')
