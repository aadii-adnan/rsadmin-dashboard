from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Status
from payments.models import CreditTransaction
from services.models import Service

from .models import Booking
from .tokens import make_manage_booking_token


class CancellationRefundChoiceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.confirmed = Status.objects.create(name='Confirmed', type='booking')
        self.cancelled = Status.objects.create(name='Cancelled', type='booking')
        self.service = Service.objects.create(
            name='Park and Ride',
            description='Short description',
            long_description='Long description',
            base_price=Decimal('50.00'),
            per_day_price=Decimal('10.00'),
            enabled=True,
            website='rsexpressparking',
        )
        self.user = get_user_model().objects.create_user(
            username='customer',
            email='customer@example.com',
            password='test-password',
            bonus_points=Decimal('10.00'),
        )

    def make_booking(self, **overrides):
        values = {
            'service': self.service,
            'first_name': 'Alison',
            'last_name': 'Customer',
            'email': 'alison@example.com',
            'contact_no': '+353871234567',
            'total_passengers': 1,
            'car_registration_no': '261-D-1234',
            'car_model': 'Corolla',
            'car_colour': 'Silver',
            'car_manufacturer': 'Toyota',
            'departure_terminal': 'T1',
            'return_terminal': 'T1',
            'departure_time': timezone.now() + timedelta(days=10),
            'return_time': timezone.now() + timedelta(days=14),
            'total_price': Decimal('140.00'),
            'discounted_price': Decimal('120.00'),
            'status': self.confirmed,
        }
        values.update(overrides)
        return Booking.objects.create(**values)

    @patch('bookings.views.send_cancellation_email_task.delay')
    def test_logged_in_points_return_full_booking_value_without_fee(self, _email):
        booking = self.make_booking(user=self.user, email=self.user.email)
        self.client.force_authenticate(self.user)

        response = self.client.post(
            f'/api/bookings/{booking.id}/cancel/',
            {'refund': False},
            format='json',
            secure=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['outcome'], 'points')
        self.user.refresh_from_db()
        self.assertEqual(self.user.bonus_points, Decimal('130.00'))
        transaction = CreditTransaction.objects.get(booking=booking)
        self.assertEqual(transaction.amount, Decimal('120.00'))

    @patch('bookings.views.send_cancellation_email_task.delay')
    def test_logged_in_bank_refund_does_not_add_points(self, _email):
        booking = self.make_booking(user=self.user, email=self.user.email)
        self.client.force_authenticate(self.user)

        response = self.client.post(
            f'/api/bookings/{booking.id}/cancel/',
            {'refund': True},
            format='json',
            secure=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['outcome'], 'refund')
        self.user.refresh_from_db()
        self.assertEqual(self.user.bonus_points, Decimal('10.00'))
        self.assertFalse(CreditTransaction.objects.filter(booking=booking).exists())

    @patch('bookings.guest_views.send_password_reset_email_task.delay')
    @patch('bookings.guest_views.send_cancellation_email_task.delay')
    def test_guest_points_create_account_and_credit_full_value(
        self,
        _cancellation_email,
        account_email,
    ):
        booking = self.make_booking()
        token = make_manage_booking_token(booking)

        response = self.client.post(
            '/api/bookings/manage/cancel/',
            {'token': token, 'refund': False},
            format='json',
            secure=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['outcome'], 'points')
        self.assertTrue(response.data['account_created'])
        booking.refresh_from_db()
        self.assertIsNotNone(booking.user_id)
        self.assertEqual(booking.user.bonus_points, Decimal('120.00'))
        transaction = CreditTransaction.objects.get(booking=booking)
        self.assertEqual(transaction.amount, Decimal('120.00'))
        account_email.assert_called_once()

    @patch('bookings.guest_views.send_password_reset_email_task.delay')
    @patch('bookings.guest_views.send_cancellation_email_task.delay')
    def test_guest_bank_refund_does_not_create_points_account(
        self,
        _cancellation_email,
        account_email,
    ):
        booking = self.make_booking()
        token = make_manage_booking_token(booking)

        response = self.client.post(
            '/api/bookings/manage/cancel/',
            {'token': token, 'refund': True},
            format='json',
            secure=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['outcome'], 'refund')
        self.assertFalse(response.data['account_created'])
        booking.refresh_from_db()
        self.assertIsNone(booking.user_id)
        self.assertFalse(CreditTransaction.objects.filter(booking=booking).exists())
        account_email.assert_not_called()
