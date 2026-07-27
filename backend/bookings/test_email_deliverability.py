from types import SimpleNamespace
from unittest.mock import MagicMock, call, patch

from django.test import SimpleTestCase

from .tasks import (
    GMASS_TEST_RECIPIENTS,
    PROMOTIONAL_CAMPAIGNS,
    get_promotional_campaign,
    get_promotional_email_connection,
    send_promotional_emails,
    send_promotional_deliverability_test,
    send_promotional_message,
)


class PromotionalCampaignResolverTests(SimpleTestCase):
    def setUp(self):
        self.settings_obj = SimpleNamespace(
            promotional_email_content="<p>RS promo {{first_name}} {{current_year}}</p>",
            pending_bookings_email_content="<p>RS pending {{first_name}} {{current_year}}</p>",
            dublin_promotional_email_content="<p>Dublin promo {{first_name}} {{current_year}}</p>",
            dublin_pending_bookings_email_content="<p>Dublin pending {{first_name}} {{current_year}}</p>",
        )

    def test_all_variants_resolve_live_content_subject_and_sender(self):
        expected = {
            "rs_promotional": (
                "<p>RS promo Customer 2030</p>",
                "Park With Us Again & Save 10%",
                "RS Express Parking <hello@rsexpressparking.com>",
            ),
            "rs_pending": (
                "<p>RS pending Customer 2030</p>",
                "Complete Your Booking & Save 10% Today!",
                "RS Express Parking <hello@rsexpressparking.com>",
            ),
            "dublin_promotional": (
                "<p>Dublin promo Customer 2030</p>",
                "Park With Us Again & Save 10%",
                "Dublin Airport Express Parking <hello@dublinairportexpressparking.ie>",
            ),
            "dublin_pending": (
                "<p>Dublin pending Customer 2030</p>",
                "Complete Your Booking & Save 10% Today!",
                "Dublin Airport Express Parking <hello@dublinairportexpressparking.ie>",
            ),
        }

        for campaign, (html, subject, from_email) in expected.items():
            with self.subTest(campaign=campaign):
                result = get_promotional_campaign(
                    campaign,
                    self.settings_obj,
                    first_name="Customer",
                    current_year=2030,
                )
                self.assertEqual(result["html_content"], html)
                self.assertEqual(result["subject"], subject)
                self.assertEqual(result["from_email"], from_email)

    @patch("bookings.tasks.get_promotional_email_connection")
    @patch("bookings.tasks.EmailMultiAlternatives")
    def test_message_uses_resolved_html_and_individual_recipient(
        self,
        email_class,
        get_connection,
    ):
        connection = object()
        get_connection.return_value = connection
        message = email_class.return_value

        send_promotional_message(
            "seed@example.com",
            "rs_promotional",
            self.settings_obj,
            first_name="Customer",
            current_year=2030,
        )

        email_class.assert_called_once_with(
            subject="Park With Us Again & Save 10%",
            body="This email requires an HTML-compatible email client.",
            from_email="RS Express Parking <hello@rsexpressparking.com>",
            to=["seed@example.com"],
            connection=connection,
        )
        message.attach_alternative.assert_called_once_with(
            "<p>RS promo Customer 2030</p>",
            "text/html",
        )
        message.send.assert_called_once_with()

    @patch("bookings.tasks.config")
    @patch("bookings.tasks.get_connection")
    def test_each_brand_uses_its_live_smtp_account(
        self,
        get_connection,
        config,
    ):
        setting_values = {
            "EMAIL_HOST": "smtp.example.com",
            "EMAIL_PORT": 587,
            "EMAIL_USE_TLS": True,
            "EMAIL_HOST_PASSWORD": "rs-secret",
            "DUBLIN_EMAIL_HOST_PASSWORD": "dublin-secret",
        }
        config.side_effect = lambda name, cast=None: setting_values[name]

        expected_accounts = {
            "rs_promotional": ("hello@rsexpressparking.com", "rs-secret"),
            "rs_pending": ("hello@rsexpressparking.com", "rs-secret"),
            "dublin_promotional": (
                "hello@dublinairportexpressparking.ie",
                "dublin-secret",
            ),
            "dublin_pending": (
                "hello@dublinairportexpressparking.ie",
                "dublin-secret",
            ),
        }

        for campaign, (username, password) in expected_accounts.items():
            with self.subTest(campaign=campaign):
                details = get_promotional_campaign(campaign, self.settings_obj)
                get_promotional_email_connection(details)
                get_connection.assert_called_with(
                    host="smtp.example.com",
                    port=587,
                    username=username,
                    password=password,
                    use_tls=True,
                )

    def test_unknown_campaign_is_rejected(self):
        with self.assertRaises(ValueError):
            get_promotional_campaign("unknown", self.settings_obj)


class PromotionalDeliverabilityTaskTests(SimpleTestCase):
    @patch("bookings.tasks.datetime")
    @patch("bookings.tasks.BookingSettings.objects.first")
    @patch("bookings.tasks.UnsubscribedEmail.objects.values_list")
    @patch("bookings.tasks.Booking.objects.filter")
    @patch("bookings.tasks.send_promotional_message")
    def test_monday_task_uses_the_shared_resolver_for_live_variants(
        self,
        send_message,
        booking_filter,
        unsubscribed_values,
        settings_first,
        datetime_mock,
    ):
        settings_obj = object()
        settings_first.return_value = settings_obj
        unsubscribed_values.return_value = []
        datetime_mock.now.return_value = SimpleNamespace(year=2030)

        promo_booking = SimpleNamespace(
            id=1,
            email="promo@example.com",
            first_name="Promo",
            website="dublinairportparking",
        )
        pending_booking = SimpleNamespace(
            id=2,
            email="pending@example.com",
            first_name="Pending",
            website="rsexpressparking",
        )
        all_bookings = MagicMock()
        all_bookings.exclude.return_value = [promo_booking]
        all_bookings.filter.return_value = [pending_booking]
        confirmed_lookup = MagicMock()
        confirmed_lookup.exclude.return_value.exists.return_value = False

        def filter_side_effect(**kwargs):
            if kwargs == {"supplier__isnull": True}:
                return all_bookings
            return confirmed_lookup

        booking_filter.side_effect = filter_side_effect

        send_promotional_emails.run()

        self.assertEqual(
            send_message.call_args_list,
            [
                call(
                    "promo@example.com",
                    "dublin_promotional",
                    settings_obj,
                    first_name="Promo",
                    current_year=2030,
                ),
                call(
                    "pending@example.com",
                    "rs_pending",
                    settings_obj,
                    first_name="Pending",
                    current_year=2030,
                ),
            ],
        )

    @patch("bookings.tasks.BookingSettings.objects.first")
    @patch("bookings.tasks.send_promotional_message")
    def test_task_attempts_all_15_unique_recipients_individually(
        self,
        send_message,
        settings_first,
    ):
        settings_obj = object()
        settings_first.return_value = settings_obj

        result = send_promotional_deliverability_test.run("rs_promotional")

        self.assertEqual(len(GMASS_TEST_RECIPIENTS), 15)
        self.assertEqual(len(set(GMASS_TEST_RECIPIENTS)), 15)
        self.assertEqual(send_message.call_count, 15)
        self.assertEqual(
            send_message.call_args_list,
            [
                call(
                    recipient,
                    "rs_promotional",
                    settings_obj,
                    first_name="Customer",
                )
                for recipient in GMASS_TEST_RECIPIENTS
            ],
        )
        self.assertEqual(result["sent"], 15)
        self.assertEqual(result["failed"], 0)

    @patch("bookings.tasks.BookingSettings.objects.first")
    @patch("bookings.tasks.send_promotional_message")
    def test_one_recipient_failure_does_not_stop_remaining_sends(
        self,
        send_message,
        settings_first,
    ):
        settings_first.return_value = object()
        failed_recipient = GMASS_TEST_RECIPIENTS[1]

        def send_or_fail(recipient, *args, **kwargs):
            if recipient == failed_recipient:
                raise RuntimeError("SMTP failure")

        send_message.side_effect = send_or_fail

        result = send_promotional_deliverability_test.run("dublin_pending")

        self.assertEqual(send_message.call_count, 15)
        self.assertEqual(result["sent"], 14)
        self.assertEqual(result["failed"], 1)
        self.assertEqual(result["failed_recipients"], [failed_recipient])

    def test_task_rejects_unknown_campaign_before_querying_settings(self):
        with patch("bookings.tasks.BookingSettings.objects.first") as settings_first:
            with self.assertRaises(ValueError):
                send_promotional_deliverability_test.run("unknown")
        settings_first.assert_not_called()

    def test_all_supported_variants_are_exposed(self):
        self.assertEqual(
            set(PROMOTIONAL_CAMPAIGNS),
            {
                "rs_promotional",
                "rs_pending",
                "dublin_promotional",
                "dublin_pending",
            },
        )
