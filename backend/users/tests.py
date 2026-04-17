from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.test import TestCase
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient

from .serializers import GENERIC_FORGOT_PASSWORD_MESSAGE


User = get_user_model()


class PasswordResetAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="resetuser",
            email="resetuser@example.com",
            password="OldPassword123!",
            first_name="Reset",
            last_name="User",
        )
        self.token_generator = PasswordResetTokenGenerator()

    def _build_uid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = self.token_generator.make_token(self.user)
        return uid, token

    @patch("users.views.send_password_reset_email_task.delay")
    def test_forgot_password_existing_email_returns_generic_success(self, mocked_delay):
        response = self.client.post(
            "/api/auth/forgot-password/",
            {"email": self.user.email, "website": "rsexpressparking"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], GENERIC_FORGOT_PASSWORD_MESSAGE)
        mocked_delay.assert_called_once()

    @patch("users.views.send_password_reset_email_task.delay")
    def test_forgot_password_unknown_email_returns_same_generic_success(self, mocked_delay):
        response = self.client.post(
            "/api/auth/forgot-password/",
            {"email": "does-not-exist@example.com", "website": "rsexpressparking"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], GENERIC_FORGOT_PASSWORD_MESSAGE)
        mocked_delay.assert_not_called()

    def test_validate_endpoint_success(self):
        uid, token = self._build_uid_token()
        response = self.client.get(
            "/api/auth/reset-password/validate/",
            {"uid": uid, "token": token},
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["valid"])

    def test_validate_endpoint_invalid_token_failure(self):
        uid, _ = self._build_uid_token()
        response = self.client.get(
            "/api/auth/reset-password/validate/",
            {"uid": uid, "token": "invalid-token"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["valid"])

    def test_reset_confirm_success_updates_password(self):
        uid, token = self._build_uid_token()
        new_password = "NewSecurePassword123!"

        response = self.client.post(
            "/api/auth/reset-password/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password": new_password,
                "confirm_password": new_password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))

    def test_reset_confirm_invalid_or_expired_token_fails(self):
        uid, token = self._build_uid_token()
        self.user.set_password("PasswordChangedAfterToken123!")
        self.user.save(update_fields=["password"])

        response = self.client.post(
            "/api/auth/reset-password/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password": "AnotherStrongPass123!",
                "confirm_password": "AnotherStrongPass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_reset_confirm_weak_password_fails(self):
        uid, token = self._build_uid_token()

        response = self.client.post(
            "/api/auth/reset-password/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password": "123",
                "confirm_password": "123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("new_password", response.json())

    def test_reset_confirm_mismatched_password_fails(self):
        uid, token = self._build_uid_token()

        response = self.client.post(
            "/api/auth/reset-password/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password": "StrongPassword123!",
                "confirm_password": "DifferentPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("confirm_password", response.json())
