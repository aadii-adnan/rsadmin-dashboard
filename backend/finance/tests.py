from types import SimpleNamespace
from unittest.mock import patch
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.http import QueryDict
from django.test import SimpleTestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from .serializers import ExpenseSerializer
from .views import (
    finance_comparison,
    previous_finance_period,
    resolve_finance_period,
    resolve_finance_website,
    should_count_booking_for_earnings,
)


class NoShowEarningsTests(SimpleTestCase):
    def test_paid_no_show_counts_as_earnings(self):
        booking = SimpleNamespace(
            status=SimpleNamespace(name='No Show'),
            supplier=None,
        )

        self.assertTrue(should_count_booking_for_earnings(booking))


class FinanceFilterContractTests(SimpleTestCase):
    def test_canonical_month_range_is_resolved(self):
        query = QueryDict(
            "period_type=range&start_month=2026-04&end_month=2026-06"
            "&website=rsexpressparking"
        )

        start, end, label, period_type = resolve_finance_period(query)

        self.assertEqual(start, date(2026, 4, 1))
        self.assertEqual(end, date(2026, 6, 30))
        self.assertEqual(label, "Apr 2026 – Jun 2026")
        self.assertEqual(period_type, "range")
        self.assertEqual(resolve_finance_website(query), "rsexpressparking")

    def test_reversed_range_is_rejected(self):
        query = QueryDict(
            "period_type=range&start_month=2026-06&end_month=2026-04"
        )

        with self.assertRaisesMessage(ValueError, "start_month cannot be after end_month"):
            resolve_finance_period(query)

    def test_previous_range_uses_the_same_number_of_months(self):
        previous = previous_finance_period(
            date(2026, 4, 1),
            date(2026, 6, 30),
            "range",
        )

        self.assertEqual(previous, (date(2026, 1, 1), date(2026, 3, 31)))

    def test_zero_previous_value_has_no_percentage_baseline(self):
        current = {
            "balance": Decimal("120.00"),
            "earnings": Decimal("50.00"),
            "expenses": Decimal("10.00"),
            "profit_or_loss": Decimal("40.00"),
        }
        previous = {key: Decimal("0.00") for key in current}

        comparison = finance_comparison(current, previous)

        self.assertIsNone(comparison["balance"]["percent"])
        self.assertEqual(comparison["balance"]["delta"], 120.0)


class ExpenseSerializerValidationTests(SimpleTestCase):
    def test_fixed_expense_requires_a_positive_amount(self):
        serializer = ExpenseSerializer(data={
            "name": "Insurance",
            "amount": "0.00",
            "recurring": False,
            "for_month": "2026-06-01",
            "website": "both",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("amount", serializer.errors)

    def test_fixed_expense_requires_a_month(self):
        serializer = ExpenseSerializer(data={
            "name": "Insurance",
            "amount": "10.00",
            "recurring": False,
            "website": "both",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("for_month", serializer.errors)

    def test_recurring_end_cannot_precede_start(self):
        serializer = ExpenseSerializer(data={
            "name": "Software",
            "amount": "25.00",
            "recurring": True,
            "recurring_start_month": "2026-06-01",
            "recurring_end_month": "2026-05-01",
            "website": "rsexpressparking",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("recurring_end_month", serializer.errors)

    def test_valid_recurring_expense_clears_fixed_month(self):
        serializer = ExpenseSerializer(data={
            "name": "Software",
            "amount": "25.00",
            "recurring": True,
            "for_month": "2026-06-01",
            "recurring_start_month": "2026-06-01",
            "website": "rsexpressparking",
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(serializer.validated_data["for_month"])


class EmailDeliverabilityTestViewTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.superadmin = user_model.objects.create_user(
            username="superadmin",
            password="password",
            is_superuser=True,
            is_staff=True,
        )
        self.manager = user_model.objects.create_user(
            username="manager",
            password="password",
            is_superuser=True,
            is_staff=True,
            is_manager=True,
        )
        self.supplier = user_model.objects.create_user(
            username="supplier",
            password="password",
            is_supplier=True,
        )
        self.supplier_superuser = user_model.objects.create_user(
            username="supplier-superuser",
            password="password",
            is_supplier=True,
            is_superuser=True,
            is_staff=True,
        )
        self.ordinary_user = user_model.objects.create_user(
            username="customer",
            password="password",
        )
        self.url = reverse("email-deliverability-test")

    @patch("finance.views.send_promotional_deliverability_test.delay")
    def test_superadmin_can_queue_each_supported_campaign(self, delay):
        delay.return_value.id = "task-123"
        expected_senders = {
            "rs_promotional": "RS Express Parking <hello@rsexpressparking.com>",
            "rs_pending": "RS Express Parking <hello@rsexpressparking.com>",
            "dublin_promotional": (
                "Dublin Airport Express Parking "
                "<hello@dublinairportexpressparking.ie>"
            ),
            "dublin_pending": (
                "Dublin Airport Express Parking "
                "<hello@dublinairportexpressparking.ie>"
            ),
        }
        self.client.force_authenticate(self.superadmin)

        for campaign, sender in expected_senders.items():
            with self.subTest(campaign=campaign):
                response = self.client.post(
                    self.url,
                    {"campaign": campaign},
                    format="json",
                )
                self.assertEqual(response.status_code, 202)
                self.assertEqual(response.data["campaign"], campaign)
                self.assertEqual(response.data["sender"], sender)
                self.assertEqual(response.data["recipient_count"], 15)
                self.assertEqual(response.data["task_id"], "task-123")

        self.assertEqual(delay.call_count, 4)

    @patch("finance.views.send_promotional_deliverability_test.delay")
    def test_invalid_campaign_returns_400_without_queueing(self, delay):
        self.client.force_authenticate(self.superadmin)

        response = self.client.post(
            self.url,
            {"campaign": "unknown"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid campaign.")
        delay.assert_not_called()

    @patch("finance.views.send_promotional_deliverability_test.delay")
    def test_non_superadmin_roles_are_forbidden(self, delay):
        for user in (
            self.manager,
            self.supplier,
            self.supplier_superuser,
            self.ordinary_user,
        ):
            with self.subTest(username=user.username):
                self.client.force_authenticate(user)
                response = self.client.post(
                    self.url,
                    {"campaign": "rs_promotional"},
                    format="json",
                )
                self.assertEqual(response.status_code, 403)

        delay.assert_not_called()

    @patch("finance.views.send_promotional_deliverability_test.delay")
    def test_unauthenticated_request_is_rejected(self, delay):
        response = self.client.post(
            self.url,
            {"campaign": "rs_promotional"},
            format="json",
        )

        self.assertIn(response.status_code, (401, 403))
        delay.assert_not_called()
