from django.test import TestCase

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import Service


class StaffCatalogTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = get_user_model().objects.create_user(username="catalog-admin", password="pass", is_superuser=True)
        self.manager = get_user_model().objects.create_user(username="catalog-manager", password="pass", is_manager=True)

    def test_manager_cannot_change_pricing(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post("/api/services/staff/services/", {"name": "Unsafe", "description": "x", "long_description": "x", "base_price": "1", "per_day_price": "1"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_service_rejects_negative_prices(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/services/staff/services/", {"name": "Safe", "description": "x", "long_description": "x", "base_price": "-1", "per_day_price": "1"}, format="json")
        self.assertEqual(response.status_code, 400)
