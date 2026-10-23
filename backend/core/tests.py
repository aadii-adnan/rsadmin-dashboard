from django.test import TestCase

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


class StaffConfigurationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.admin = User.objects.create_user(username="config-admin", password="pass", is_superuser=True)
        self.supplier = User.objects.create_user(username="config-supplier", password="pass", is_supplier=True)

    def test_global_settings_are_not_available_to_supplier(self):
        self.client.force_authenticate(self.supplier)
        self.assertEqual(self.client.get("/api/core/staff/booking-settings/").status_code, 403)

    def test_status_type_must_match_model_choices(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/core/staff/statuses/", {"name": "Bad", "type": "unknown"}, format="json")
        self.assertEqual(response.status_code, 400)
