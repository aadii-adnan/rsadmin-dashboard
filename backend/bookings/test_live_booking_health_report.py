import json
from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from core.models import Status
from payments.models import Payment
from services.models import Service

from .management.commands.live_booking_health_report import classify_failure
from .models import Booking


class FailureClassificationTests(SimpleTestCase):
    def test_distinguishes_card_declines_from_technical_errors(self):
        self.assertEqual(classify_failure("Your card was declined"), "card_decline")
        self.assertEqual(classify_failure("Stripe API timeout"), "technical")
        self.assertEqual(classify_failure(""), "unclassified")


class LiveBookingHealthReportTests(TestCase):
    def test_reports_failed_attempts_and_duplicate_clusters(self):
        booking_status = Status.objects.create(
            name="Payment Failed", type="booking"
        )
        payment_status = Status.objects.create(name="Failed", type="payment")
        service = Service.objects.create(
            name="Report Meet and Greet",
            description="Short description",
            long_description="Long description",
            base_price=Decimal("50.00"),
            per_day_price=Decimal("10.00"),
            enabled=True,
            website="rsexpressparking",
        )
        created_at = timezone.now() - timedelta(minutes=5)
        shared = {
            "service": service,
            "first_name": "Alison",
            "last_name": "OKane",
            "email": " ALISON@example.com ",
            "contact_no": "+353 87 123 4567",
            "total_passengers": 1,
            "car_registration_no": "261-D-1234",
            "car_model": "Corolla",
            "car_colour": "Silver",
            "car_manufacturer": "Toyota",
            "departure_terminal": "1",
            "return_terminal": "2",
            "departure_time": timezone.now() + timedelta(days=10),
            "return_time": timezone.now() + timedelta(days=15),
            "total_price": Decimal("100.00"),
            "discounted_price": Decimal("100.00"),
            "status": booking_status,
            "website": "rsexpressparking",
        }
        first = Booking.objects.create(created_at=created_at, **shared)
        second = Booking.objects.create(
            created_at=created_at + timedelta(minutes=2),
            **shared,
        )
        for index, booking in enumerate((first, second), start=1):
            Payment.objects.create(
                booking=booking,
                stripe_payment_intent=f"pi_report_{index}",
                stripe_customer_id=f"cus_report_{index}",
                amount=Decimal("100.00"),
                status=payment_status,
                status_message="Stripe API timeout",
            )

        output = StringIO()
        call_command("live_booking_health_report", stdout=output)
        report = json.loads(output.getvalue())

        self.assertEqual(
            report["current"]["unique_bookings_marked_payment_failed"], 2
        )
        self.assertEqual(report["current"]["payments"]["failed_attempts"], 2)
        self.assertEqual(report["current"]["failure_categories"]["technical"], 2)
        self.assertEqual(report["possible_duplicate_cluster_count"], 1)
        self.assertEqual(
            len(report["possible_duplicate_clusters"][0]["bookings"]), 2
        )
