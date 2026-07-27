from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from .views import should_count_booking_for_earnings


class NoShowEarningsTests(SimpleTestCase):
    def test_paid_no_show_counts_as_earnings(self):
        booking = SimpleNamespace(
            status=SimpleNamespace(name='No Show'),
            supplier=None,
        )

        self.assertTrue(should_count_booking_for_earnings(booking))


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
        for user in (self.manager, self.supplier, self.ordinary_user):
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
