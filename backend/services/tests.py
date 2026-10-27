from django.test import TestCase

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import AddOn, Coupon, Service
from django.utils import timezone


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

    def test_full_superadmin_can_read_each_staff_catalog_detail(self):
        service = Service.objects.create(
            name="Detail Service", description="Short", long_description="Long",
            base_price="10.00", per_day_price="2.00",
        )
        addon = AddOn.objects.create(name="Detail Add-on", price="3.00")
        coupon = Coupon.objects.create(
            code="DETAIL", discount_percent=10, valid_from=timezone.now(), max_uses=5,
        )
        self.client.force_authenticate(self.admin)

        for url, expected_name in (
            (f"/api/services/staff/services/{service.id}/", service.name),
            (f"/api/services/staff/addons/{addon.id}/", addon.name),
            (f"/api/services/staff/coupons/{coupon.id}/", coupon.code),
        ):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200)
                self.assertIn(expected_name, response.data.values())

    def test_manager_cannot_read_staff_catalog_details(self):
        service = Service.objects.create(
            name="Private Service", description="Short", long_description="Long",
            base_price="10.00", per_day_price="2.00",
        )
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.get(f"/api/services/staff/services/{service.id}/").status_code, 403)
