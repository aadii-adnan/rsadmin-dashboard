from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch
import uuid

from django.test import TestCase
from rest_framework.test import APIClient

from bookings.models import Booking
from core.models import Status
from services.models import Service

from .models import Payment


class PaymentIntentIdempotencyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.booking_status = Status.objects.create(name='Pending', type='booking')
        self.payment_pending = Status.objects.create(name='Pending', type='payment')
        self.payment_succeeded = Status.objects.create(name='Succeeded', type='payment')
        self.service = Service.objects.create(
            name='Payment Test Service',
            description='Short description',
            long_description='Long description',
            base_price=Decimal('50.00'),
            per_day_price=Decimal('10.00'),
            enabled=True,
            website='rsexpressparking',
        )
        self.booking = Booking.objects.create(
            service=self.service,
            first_name='Pay',
            last_name='Tester',
            email='pay@example.com',
            contact_no='+353871234567',
            total_passengers=1,
            car_registration_no='261-D-1111',
            car_model='Corolla',
            car_colour='Silver',
            car_manufacturer='Toyota',
            departure_terminal='1',
            return_terminal='1',
            departure_time=datetime(2026, 9, 1, 5, tzinfo=timezone.utc),
            return_time=datetime(2026, 9, 5, 17, tzinfo=timezone.utc),
            total_price=Decimal('100.00'),
            discounted_price=Decimal('100.00'),
            status=self.booking_status,
        )

    @patch('payments.views.stripe.PaymentIntent.retrieve')
    @patch('payments.views.stripe.PaymentIntent.create')
    @patch('payments.views.stripe.Customer.create')
    def test_replayed_attempt_returns_one_payment(
        self,
        customer_create,
        intent_create,
        intent_retrieve,
    ):
        customer_create.return_value = SimpleNamespace(id='cus_test')
        intent_create.return_value = {
            'id': 'pi_test',
            'client_secret': 'secret_test',
        }
        intent_retrieve.return_value = {
            'id': 'pi_test',
            'client_secret': 'secret_test',
        }
        attempt_id = str(uuid.uuid4())
        url = f'/api/payments/create-intent/{self.booking.id}/'

        first = self.client.post(
            url,
            {},
            format='json',
            HTTP_IDEMPOTENCY_KEY=attempt_id,
        )
        second = self.client.post(
            url,
            {},
            format='json',
            HTTP_IDEMPOTENCY_KEY=attempt_id,
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data['payment_id'], second.data['payment_id'])
        self.assertEqual(Payment.objects.count(), 1)
        customer_create.assert_called_once()
        intent_create.assert_called_once()
        intent_retrieve.assert_called_once_with('pi_test')

    def test_already_paid_booking_rejects_new_intent(self):
        Payment.objects.create(
            booking=self.booking,
            stripe_payment_intent='pi_paid',
            stripe_customer_id='cus_paid',
            amount=Decimal('100.00'),
            status=self.payment_succeeded,
        )

        response = self.client.post(
            f'/api/payments/create-intent/{self.booking.id}/',
            {},
            format='json',
            HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'already_paid')
