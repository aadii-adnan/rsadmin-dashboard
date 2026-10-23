from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse

from .models import CreditTransaction
from .tasks import send_manual_credit_confirmation_email_task
from rest_framework.test import APIClient


class StaffCreditLedgerTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.admin = User.objects.create_user(username="ledger-admin", password="pass", is_superuser=True)
        self.manager = User.objects.create_user(username="ledger-manager", password="pass", is_manager=True)
        self.customer = User.objects.create_user(username="ledger-customer", password="pass", bonus_points=Decimal("10.00"))

    def test_only_full_admin_can_adjust_and_adjustment_is_audited(self):
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.post("/api/payments/staff/credits/", {}, format="json").status_code, 403)
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/payments/staff/credits/", {"user_id": self.customer.pk, "amount": "5.00", "note": "Service recovery", "website": "rsexpressparking"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.customer.refresh_from_db()
        transaction = CreditTransaction.objects.get(pk=response.data["id"])
        self.assertEqual(self.customer.bonus_points, Decimal("15.00"))
        self.assertEqual(transaction.transaction_type, CreditTransaction.TYPE_ADJUSTMENT)
        self.assertEqual(transaction.balance_after, Decimal("15.00"))

    def test_adjustment_cannot_make_balance_negative(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/payments/staff/credits/", {"user_id": self.customer.pk, "amount": "-11.00", "note": "Bad deduction", "website": "rsexpressparking"}, format="json")
        self.assertEqual(response.status_code, 400)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class ManualCreditEmailTaskTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="creditcustomer",
            email="customer@example.com",
            first_name="Chris",
            password="test-password",
        )
        self.transaction = CreditTransaction.objects.create(
            user=self.user,
            transaction_type=CreditTransaction.TYPE_ADJUSTMENT,
            amount=Decimal("25.00"),
            balance_after=Decimal("40.00"),
            note="Customer service credit",
            status=CreditTransaction.STATUS_SUCCEEDED,
            website="rsexpressparking",
        )

    def test_sends_balance_and_booking_guide(self):
        result = send_manual_credit_confirmation_email_task(self.transaction.pk)

        self.assertEqual(result, "Manual credit confirmation email sent")
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.to, ["customer@example.com"])
        self.assertIn("credits added to your account", email.subject)
        self.assertIn("Amount added: EUR 25.00", email.body)
        self.assertIn("New credit balance: EUR 40.00", email.body)
        self.assertIn("log in with your username (creditcustomer)", email.body)
        self.assertIn("applied automatically in the price summary", email.body)
        self.assertIn("https://www.rsexpressparking.com/login", email.body)
        self.assertIn("Pay with Credits", email.body)

        html_body = email.alternatives[0][0]
        self.assertIn("How to use your credits", html_body)
        self.assertIn("Start a booking", html_body)

    def test_does_not_email_for_a_deduction(self):
        self.transaction.amount = Decimal("-5.00")
        self.transaction.save(update_fields=["amount"])

        result = send_manual_credit_confirmation_email_task(self.transaction.pk)

        self.assertEqual(result, "Credit adjustment did not add credits")
        self.assertEqual(len(mail.outbox), 0)


class CreditTransactionAdminEmailTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin_user = User.objects.create_superuser(
            username="creditadmin",
            email="admin@example.com",
            password="test-password",
        )
        self.customer = User.objects.create_user(
            username="creditrecipient",
            email="recipient@example.com",
            password="test-password",
        )
        self.client.force_login(self.admin_user)
        self.add_url = reverse("admin:payments_credittransaction_add")

    @patch("payments.tasks.send_manual_credit_confirmation_email_task.delay")
    def test_save_and_send_button_adds_credits_and_queues_email(self, delay):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                self.add_url,
                {
                    "user": self.customer.pk,
                    "amount": "30.00",
                    "note": "Goodwill credit",
                    "website": "rsexpressparking",
                    "_save_and_send_email": "1",
                },
            )

        self.assertEqual(response.status_code, 302)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.bonus_points, Decimal("30.00"))
        transaction = CreditTransaction.objects.get(user=self.customer)
        self.assertEqual(transaction.balance_after, Decimal("30.00"))
        self.assertEqual(transaction.transaction_type, CreditTransaction.TYPE_ADJUSTMENT)
        delay.assert_called_once_with(transaction.pk)

    @patch("payments.tasks.send_manual_credit_confirmation_email_task.delay")
    def test_normal_save_does_not_queue_email(self, delay):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                self.add_url,
                {
                    "user": self.customer.pk,
                    "amount": "10.00",
                    "note": "Silent adjustment",
                    "website": "rsexpressparking",
                    "_save": "Save",
                },
            )

        self.assertEqual(response.status_code, 302)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.bonus_points, Decimal("10.00"))
        delay.assert_not_called()

    def test_email_button_is_visible_only_on_add_form(self):
        response = self.client.get(self.add_url)

        self.assertContains(response, "Save and send credit email to customer")
        self.assertContains(response, 'name="_save_and_send_email"')
