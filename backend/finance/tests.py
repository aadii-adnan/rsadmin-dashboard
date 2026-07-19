from types import SimpleNamespace

from django.test import SimpleTestCase

from .views import should_count_booking_for_earnings


class NoShowEarningsTests(SimpleTestCase):
    def test_paid_no_show_counts_as_earnings(self):
        booking = SimpleNamespace(
            status=SimpleNamespace(name='No Show'),
            supplier=None,
        )

        self.assertTrue(should_count_booking_for_earnings(booking))
