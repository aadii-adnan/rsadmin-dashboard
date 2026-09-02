"""Public endpoints for the guest manage-booking flow.

A guest looks up their booking by booking_id + email; a signed 24h link is
emailed to the booking's address. The link token then authorizes viewing,
rescheduling and cancelling that one booking. Works for any booking matched
by booking_id + email (registered users included) — email ownership is the
proof of access.
"""
from datetime import timedelta
import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils.text import slugify
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from core.models import Status
from .booking_rules import (
    RESCHEDULE_DAY_RATE,
    RESCHEDULE_MIN_HOURS,
    compute_reschedule_pricing,
    find_succeeded_extra_payment,
    get_cancellation_policy,
    parse_and_localize,
    validate_reschedule,
)
from .cancellation import credit_cancellation_points
from .models import Booking
from .serializers import GuestBookingSerializer
from .tasks import (
    send_cancellation_email_task,
    send_manage_booking_link_email,
    send_reschedule_email_task,
)
from .tokens import resolve_manage_booking_token
from users.tasks import send_password_reset_email_task

GENERIC_LINK_MESSAGE = "If a matching booking exists, we've emailed you a secure link to manage it."


def _resolve_token_or_error(token):
    """Return (booking, None) on success or (None, error Response)."""
    if not token:
        return None, Response(
            {'error': 'invalid', 'message': 'A token is required.'}, status=401
        )
    try:
        booking = resolve_manage_booking_token(token)
    except signing.SignatureExpired:
        return None, Response(
            {'error': 'expired', 'message': 'This link has expired. Please request a new one.'},
            status=401,
        )
    except (signing.BadSignature, Booking.DoesNotExist):
        return None, Response(
            {'error': 'invalid', 'message': 'This link is not valid.'}, status=401
        )
    return booking, None


def _manage_flags(booking, now=None):
    """Computed permissions the manage page needs to render its actions."""
    now = now or timezone.now()
    status_name = booking.status.name.lower() if booking.status else ''
    cutoff = timedelta(hours=RESCHEDULE_MIN_HOURS)

    terminal_status = status_name in (
        'cancelled',
        'completed',
        'no show',
        'missed pickup',
    )
    departure_locked = terminal_status or status_name == 'started' or now > booking.departure_time - cutoff
    return_locked = terminal_status or now > booking.return_time - cutoff
    can_reschedule = (
        not terminal_status
        and not (departure_locked and return_locked)
    )
    policy = get_cancellation_policy(booking, now)

    return {
        'can_reschedule': can_reschedule,
        'departure_locked': departure_locked,
        'return_locked': return_locked,
        'can_cancel': policy['allowed'],
        'cancel_block_reason': policy['reason'],
        'cancel_refund_eligible': policy['refund_eligible'],
        'bonus_points_account_exists': bool(
            booking.user_id
            or get_user_model().objects.filter(email__iexact=booking.email).exists()
        ),
        'extension_day_rate': float(RESCHEDULE_DAY_RATE),
    }


def _get_or_create_bonus_points_user(booking):
    """Resolve the booking owner or create an account for a verified guest."""
    User = get_user_model()
    user = booking.user
    if not user:
        user = User.objects.filter(email__iexact=booking.email).order_by('id').first()
    if user:
        return user, False

    email_prefix = slugify(booking.email.split('@', 1)[0])[:100] or 'customer'
    while True:
        username = f"{email_prefix}-{uuid.uuid4().hex[:8]}"[:150]
        if not User.objects.filter(username=username).exists():
            break

    user = User(
        username=username,
        email=booking.email.strip().lower(),
        first_name=booking.first_name,
        last_name=booking.last_name,
        phone=booking.contact_no,
    )
    user.set_unusable_password()
    user.save()
    return user, True


class ManageBookingLinkRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'manage_booking_link'

    def post(self, request):
        booking_id = (request.data.get('booking_id') or '').strip()
        email = (request.data.get('email') or '').strip()

        if booking_id and email:
            booking = Booking.objects.filter(
                booking_id__iexact=booking_id, email__iexact=email
            ).first()
            if booking:
                send_manage_booking_link_email.delay(booking.id)

        # Always the same response — never reveal whether the lookup matched.
        return Response({'message': GENERIC_LINK_MESSAGE})


class ManageBookingDetailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'manage_booking_actions'

    def get(self, request):
        booking, error = _resolve_token_or_error(request.query_params.get('token'))
        if error:
            return error
        return Response({
            'booking': GuestBookingSerializer(booking).data,
            **_manage_flags(booking),
        })


class ManageBookingRescheduleView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'manage_booking_actions'

    def put(self, request):
        booking, error = _resolve_token_or_error(request.data.get('token'))
        if error:
            return error

        start = request.data.get('departure_time')
        end = request.data.get('return_time')
        if not start or not end:
            return Response({'error': 'Both start and end times are required.'}, status=400)

        start = parse_and_localize(start)
        end = parse_and_localize(end)

        rule_error = validate_reschedule(booking, start, end)
        if rule_error:
            return Response({'error': rule_error}, status=400)

        pricing = compute_reschedule_pricing(booking, start, end)
        # Pending bookings haven't been paid yet — the extension just raises
        # the price they'll pay. Paid bookings must pay the extension first.
        status_name = booking.status.name.lower() if booking.status else ''
        if pricing['extra_amount'] > 0 and status_name in ('confirmed', 'rescheduled', 'started'):
            payment = find_succeeded_extra_payment(booking, pricing['extra_amount'])
            if not payment:
                return Response({
                    'error': 'payment_required',
                    'message': 'The extension must be paid before the booking can be rescheduled.',
                    'extra_amount': float(pricing['extra_amount']),
                }, status=402)

        was_started = status_name == 'started'

        booking.departure_time = start
        booking.return_time = end
        booking.total_price = pricing['new_total_price']
        booking.discounted_price = pricing['new_discounted_price']
        if not was_started:
            # A Started booking keeps its status so the in-progress state
            # isn't lost (the beat task would only flip it back later).
            booking.status = Status.objects.get(name='Rescheduled', type='booking')
        booking.save()

        send_reschedule_email_task.delay(booking.id)

        return Response({
            'message': 'Booking rescheduled successfully.',
            'booking': GuestBookingSerializer(booking).data,
            **_manage_flags(booking),
        })


class ManageBookingCancelView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'manage_booking_actions'

    def post(self, request):
        booking, error = _resolve_token_or_error(request.data.get('token'))
        if error:
            return error

        policy = get_cancellation_policy(booking)
        if not policy['allowed']:
            return Response({'error': policy['reason']}, status=400)

        refund = request.data.get('refund', True)
        account_created = False
        bonus_points = None

        with transaction.atomic():
            if not policy['refund_eligible']:
                outcome = 'no_refund'
            elif refund:
                outcome = 'refund'
            else:
                outcome = 'points'
                user, account_created = _get_or_create_bonus_points_user(booking)
                balance, _ = credit_cancellation_points(booking, user)
                bonus_points = float(balance)
                if booking.user_id != user.id:
                    booking.user = user

            booking.status = Status.objects.get(name='Cancelled', type='booking')
            booking.save()

        if account_created:
            uid = urlsafe_base64_encode(force_bytes(booking.user_id))
            reset_token = default_token_generator.make_token(booking.user)
            send_password_reset_email_task.delay(
                booking.user_id,
                uid,
                reset_token,
                booking.website,
            )

        send_cancellation_email_task.delay(booking.id, outcome)

        response_data = {
            'message': 'Booking cancelled successfully.',
            'outcome': outcome,
            'refund_eligible': policy['refund_eligible'],
            'account_created': account_created,
            'booking': GuestBookingSerializer(booking).data,
            **_manage_flags(booking),
        }
        if bonus_points is not None:
            response_data['bonus_points'] = bonus_points
        return Response(response_data)
