import json
from collections import defaultdict
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Count
from django.db.models.functions import TruncWeek
from django.utils import timezone

from bookings.models import Booking, normalize_phone_number
from payments.models import Payment


CARD_DECLINE_TERMS = (
    "card declined",
    "declined",
    "do not honor",
    "insufficient",
    "expired card",
    "incorrect cvc",
    "incorrect cvv",
    "lost card",
    "stolen card",
)

TECHNICAL_ERROR_TERMS = (
    "api",
    "authentication",
    "connection",
    "exception",
    "network",
    "processing error",
    "stripe",
    "timeout",
    "webhook",
)


def classify_failure(message):
    normalized = (message or "").strip().lower()
    if any(term in normalized for term in CARD_DECLINE_TERMS):
        return "card_decline"
    if any(term in normalized for term in TECHNICAL_ERROR_TERMS):
        return "technical"
    return "unclassified"


def duplicate_identities(booking):
    email = (booking.email or "").strip().lower()
    phone = normalize_phone_number(booking.contact_no)
    identities = []
    if email:
        identities.append(f"email:{email}")
    if phone:
        identities.append(f"phone:{phone}")
    return identities


def serialize_payment(payment):
    return {
        "id": payment.pk,
        "intent": payment.stripe_payment_intent,
        "status": payment.status.name if payment.status else None,
        "status_message": payment.status_message,
        "created_at": payment.created_at.isoformat(),
    }


def build_duplicate_clusters(bookings, window):
    grouped = defaultdict(list)
    for booking in bookings:
        for identity in duplicate_identities(booking):
            grouped[
                (
                    identity,
                    booking.service_id,
                    booking.departure_time,
                    booking.return_time,
                )
            ].append(booking)

    clusters_by_booking_ids = {}
    for (identity, service_id, departure_time, return_time), candidates in grouped.items():
        candidates.sort(key=lambda booking: (booking.created_at, booking.pk))
        current = []
        for booking in candidates:
            if current and booking.created_at - current[-1].created_at > window:
                if len(current) > 1:
                    cluster_key = tuple(item.pk for item in current)
                    clusters_by_booking_ids.setdefault(
                        cluster_key, (identity, current)
                    )
                current = []
            current.append(booking)
        if len(current) > 1:
            cluster_key = tuple(item.pk for item in current)
            clusters_by_booking_ids.setdefault(cluster_key, (identity, current))

    result = []
    for identity, cluster in clusters_by_booking_ids.values():
        first = cluster[0]
        result.append(
            {
                "matched_identity": identity,
                "service_id": first.service_id,
                "service": first.service.name,
                "departure_time": first.departure_time.isoformat(),
                "return_time": first.return_time.isoformat(),
                "bookings": [
                    {
                        "id": booking.pk,
                        "booking_id": booking.booking_id,
                        "status": booking.status.name if booking.status else None,
                        "created_at": booking.created_at.isoformat(),
                        "submission_key": (
                            str(booking.submission_key)
                            if booking.submission_key
                            else None
                        ),
                        "payments": [
                            serialize_payment(payment)
                            for payment in booking.payments.all()
                        ],
                    }
                    for booking in cluster
                ],
            }
        )
    return result


class Command(BaseCommand):
    help = (
        "Generate a read-only JSON report of failed payments and possible duplicate "
        "bookings for the current database."
    )

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=90)
        parser.add_argument("--duplicate-window-minutes", type=int, default=10)

    def handle(self, *args, **options):
        days = options["days"]
        window_minutes = options["duplicate_window_minutes"]
        if days <= 0 or window_minutes <= 0:
            raise ValueError("days and duplicate-window-minutes must be positive")

        current_end = timezone.now()
        current_start = current_end - timedelta(days=days)
        previous_start = current_start - timedelta(days=days)

        current_bookings = Booking.objects.filter(
            created_at__gte=current_start,
            created_at__lt=current_end,
        )
        previous_bookings = Booking.objects.filter(
            created_at__gte=previous_start,
            created_at__lt=current_start,
        )
        current_payments = Payment.objects.filter(
            created_at__gte=current_start,
            created_at__lt=current_end,
        )
        previous_payments = Payment.objects.filter(
            created_at__gte=previous_start,
            created_at__lt=current_start,
        )

        current_failed_bookings = current_bookings.filter(
            status__name__iexact="Payment Failed"
        )
        previous_failed_bookings = previous_bookings.filter(
            status__name__iexact="Payment Failed"
        )
        current_failed_payments = current_payments.filter(
            status__name__iexact="Failed"
        )
        previous_failed_payments = previous_payments.filter(
            status__name__iexact="Failed"
        )

        failure_categories = defaultdict(int)
        for message in current_failed_payments.values_list(
            "status_message", flat=True
        ):
            failure_categories[classify_failure(message)] += 1

        def payment_summary(all_payments, failed_payments):
            total = all_payments.count()
            failed = failed_payments.count()
            return {
                "failed_attempts": failed,
                "total_attempts": total,
                "failure_rate": round(failed / total, 4) if total else 0,
            }

        duplicate_queryset = (
            current_bookings.select_related("service", "status")
            .prefetch_related("payments__status")
            .order_by("created_at", "pk")
        )
        duplicate_clusters = build_duplicate_clusters(
            list(duplicate_queryset),
            timedelta(minutes=window_minutes),
        )

        report = {
            "generated_at": current_end.isoformat(),
            "period": {
                "days": days,
                "current_start": current_start.isoformat(),
                "current_end": current_end.isoformat(),
                "previous_start": previous_start.isoformat(),
                "previous_end": current_start.isoformat(),
            },
            "current": {
                "unique_bookings_marked_payment_failed": current_failed_bookings.count(),
                "payments": payment_summary(
                    current_payments, current_failed_payments
                ),
                "failure_categories": dict(sorted(failure_categories.items())),
                "failed_attempts_by_website": list(
                    current_failed_payments.values("booking__website")
                    .annotate(count=Count("id"))
                    .order_by("-count", "booking__website")
                ),
                "failed_attempts_by_service": list(
                    current_failed_payments.values(
                        "booking__service_id", "booking__service__name"
                    )
                    .annotate(count=Count("id"))
                    .order_by("-count", "booking__service__name")
                ),
                "failed_attempts_by_week": [
                    {
                        "week": row["week"].date().isoformat(),
                        "count": row["count"],
                    }
                    for row in current_failed_payments.annotate(
                        week=TruncWeek("created_at")
                    )
                    .values("week")
                    .annotate(count=Count("id"))
                    .order_by("week")
                ],
            },
            "previous": {
                "unique_bookings_marked_payment_failed": previous_failed_bookings.count(),
                "payments": payment_summary(
                    previous_payments, previous_failed_payments
                ),
            },
            "possible_duplicate_clusters": duplicate_clusters,
            "possible_duplicate_cluster_count": len(duplicate_clusters),
            "notes": [
                "This command is read-only.",
                "Failure categories are inferred from stored status messages.",
                "BookingUser rows are pre-booking leads; their count is not a booking count.",
            ],
        }

        self.stdout.write(json.dumps(report, indent=2, default=str))
