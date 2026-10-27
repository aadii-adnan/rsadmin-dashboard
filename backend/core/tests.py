from django.test import TestCase

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import Status


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

    def test_status_detail_is_full_superadmin_only(self):
        status = Status.objects.create(name="Testing", type="booking")
        url = f"/api/core/staff/statuses/{status.id}/"

        self.client.force_authenticate(self.supplier)
        self.assertEqual(self.client.get(url).status_code, 403)

        self.client.force_authenticate(self.admin)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], status.name)
