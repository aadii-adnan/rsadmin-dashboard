from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.test import TestCase
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient
from rest_framework.test import APIRequestFactory

from .serializers import GENERIC_FORGOT_PASSWORD_MESSAGE
from core.permissions import IsFullSuperAdmin, IsStaffDashboardUser
from .models import Supplier


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


class StaffDashboardAuthorizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.factory = APIRequestFactory()
        self.customer = User.objects.create_user(
            username="customer", email="customer@example.com", password="Password123!"
        )
        self.manager = User.objects.create_user(
            username="manager", email="manager@example.com", password="Password123!", is_manager=True
        )
        self.super_admin = User.objects.create_user(
            username="superadmin", email="superadmin@example.com", password="Password123!", is_superuser=True
        )
        self.active_supplier_user = User.objects.create_user(
            username="active-supplier", email="active-supplier@example.com", password="Password123!", is_supplier=True
        )
        Supplier.objects.create(
            name="Active Supplier",
            booking_id_prefix="ACT",
            user=self.active_supplier_user,
            is_active=True,
        )
        self.inactive_supplier_user = User.objects.create_user(
            username="inactive-supplier", email="inactive-supplier@example.com", password="Password123!", is_supplier=True
        )
        Supplier.objects.create(
            name="Inactive Supplier",
            booking_id_prefix="INA",
            user=self.inactive_supplier_user,
            is_active=False,
        )

    def _permission_result(self, permission_class, user=None):
        request = self.factory.get("/api/staff-placeholder/")
        request.user = user or AnonymousUser()
        return permission_class().has_permission(request, view=None)

    def test_staff_dashboard_permission_allows_only_supported_staff_roles(self):
        self.assertFalse(self._permission_result(IsStaffDashboardUser))
        self.assertFalse(self._permission_result(IsStaffDashboardUser, self.customer))
        self.assertTrue(self._permission_result(IsStaffDashboardUser, self.manager))
        self.assertTrue(self._permission_result(IsStaffDashboardUser, self.active_supplier_user))
        self.assertFalse(self._permission_result(IsStaffDashboardUser, self.inactive_supplier_user))
        self.assertTrue(self._permission_result(IsStaffDashboardUser, self.super_admin))

    def test_full_super_admin_permission_excludes_manager_and_supplier_roles(self):
        self.assertTrue(self._permission_result(IsFullSuperAdmin, self.super_admin))
        self.assertFalse(self._permission_result(IsFullSuperAdmin, self.manager))
        self.assertFalse(self._permission_result(IsFullSuperAdmin, self.active_supplier_user))

    def test_current_user_requires_authentication(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 401)

    def test_current_user_capabilities_for_each_role(self):
        cases = [
            (self.customer, False, False, False, False),
            (self.manager, False, False, False, True),
            (self.active_supplier_user, True, True, False, True),
            (self.inactive_supplier_user, True, False, False, False),
            (self.super_admin, False, False, True, True),
        ]

        for user, is_supplier, is_active_supplier, is_full_super_admin, can_access in cases:
            with self.subTest(user=user.username):
                self.client.force_authenticate(user=user)
                response = self.client.get("/api/auth/me/")
                self.assertEqual(response.status_code, 200)
                payload = response.json()
                self.assertEqual(payload["is_supplier"], is_supplier)
                self.assertEqual(payload["is_active_supplier"], is_active_supplier)
                self.assertEqual(payload["is_full_super_admin"], is_full_super_admin)
                self.assertEqual(payload["can_access_staff_dashboard"], can_access)


class StaffPeopleManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username="people-admin", password="pass", is_superuser=True)
        self.manager = User.objects.create_user(username="people-manager", password="pass", is_manager=True)
        self.customer = User.objects.create_user(username="people-customer", password="pass")

    def test_only_full_super_admin_can_manage_users(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get("/api/auth/staff/users/").status_code, 403)
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.get("/api/auth/staff/users/").status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get("/api/auth/staff/users/").status_code, 200)

    def test_admin_cannot_change_own_staff_access(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f"/api/auth/staff/users/{self.admin.pk}/", {"is_manager": True}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_supplier_creation_creates_linked_supplier_account(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/auth/staff/suppliers/", {
            "name": "Test supplier", "booking_id_prefix": "TS", "commission_percentage": "20.00",
            "username": "test-supplier-login", "password": "Complex-pass-123!",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Supplier.objects.get(name="Test supplier").user.is_supplier)
