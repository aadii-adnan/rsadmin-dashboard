from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import ContactMessage


class StaffContactMessageDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        user_model = get_user_model()
        self.superadmin = user_model.objects.create_user(
            username="contact-admin",
            password="pass1234",
            is_superuser=True,
            is_staff=True,
        )
        self.manager = user_model.objects.create_user(
            username="contact-manager",
            password="pass1234",
            is_manager=True,
        )
        self.message = ContactMessage.objects.create(
            first_name="Ada",
            last_name="Lovelace",
            email="ada@example.com",
            phone="123456789",
            website="rsexpressparking",
            message="A complete private contact message.",
        )
        self.url = f"/api/contact/staff/{self.message.id}/"

    def test_full_superadmin_can_read_the_complete_message(self):
        self.client.force_authenticate(self.superadmin)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], self.message.message)
        self.assertEqual(response.data["email"], self.message.email)

    def test_manager_and_anonymous_users_cannot_read_private_messages(self):
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.get(self.url).status_code, 403)

        self.client.force_authenticate(user=None)
        self.assertIn(self.client.get(self.url).status_code, (401, 403))

    def test_missing_message_returns_not_found_for_authorized_user(self):
        self.client.force_authenticate(self.superadmin)
        self.assertEqual(self.client.get("/api/contact/staff/999999/").status_code, 404)
