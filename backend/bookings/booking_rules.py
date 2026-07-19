"""Shared reschedule/cancellation business rules.

Used by both the logged-in customer endpoints (bookings.views) and the
guest manage-booking endpoints (bookings.guest_views), and by the payment
views so amounts are always computed server-side.
"""
from datetime import timedelta
from decimal import Decimal

import pytz
from decouple import config
from django.utils import timezone

# Flat rate charged per extra day when a reschedule extends the stay.
RESCHEDULE_DAY_RATE = Decimal(config('RESCHEDULE_DAY_RATE', default='20.00'))

# Reschedule cutoffs: each date can only be changed up to this many hours
# before its current value, and newly picked times must be at least this
# many hours in the future.
RESCHEDULE_MIN_HOURS = 24

# Services that forfeit any refund when cancelled within this window.
NO_REFUND_WINDOW_HOURS = 72
CANCEL_72H_SERVICES = {
    "standard meet & greet parking",
    "meet & greet parking",
}

CANCELLATION_FEE = Decimal('15.00')

IRELAND_TZ = pytz.timezone('Europe/Dublin')


def calculate_parking_days(departure_dt, return_dt):
    """
    Calculate parking days by calendar date in Dublin time, always counting both start and end date as full days.
    """
    if timezone.is_naive(departure_dt):
        departure_dt = timezone.make_aware(departure_dt, timezone.utc)
    if timezone.is_naive(return_dt):
        return_dt = timezone.make_aware(return_dt, timezone.utc)
    departure_dt = departure_dt.astimezone(IRELAND_TZ)
    return_dt = return_dt.astimezone(IRELAND_TZ)
    from_date = departure_dt.date()
    to_date = return_dt.date()
    days = (to_date - from_date).days + 1
    return days


def parse_and_localize(value):
    """Parse an ISO datetime string and localize naive values to Ireland time."""
    if isinstance(value, str):
        value = timezone.datetime.fromisoformat(value)
    if timezone.is_naive(value):
        value = IRELAND_TZ.localize(value)
    return value


def _same_minute(a, b):
    """Compare two aware datetimes ignoring seconds (clients send minute precision)."""
    return a.replace(second=0, microsecond=0) == b.replace(second=0, microsecond=0)


def get_cancellation_policy(booking, now=None):
    """Return {'allowed': bool, 'reason': str|None, 'refund_eligible': bool}."""
    now = now or timezone.now()
    status_name = booking.status.name.lower() if booking.status else ''

    if status_name in ('cancelled', 'completed', 'started', 'no show'):
        return {
            'allowed': False,
            'reason': 'This booking can no longer be cancelled.',
            'refund_eligible': False,
        }
    if now >= booking.departure_time:
        return {
            'allowed': False,
            'reason': 'Bookings can only be cancelled before the departure time.',
            'refund_eligible': False,
        }

    refund_eligible = True
    service_name = (booking.service.name or '').strip().lower()
    if service_name in CANCEL_72H_SERVICES:
        cutoff = booking.departure_time - timedelta(hours=NO_REFUND_WINDOW_HOURS)
        refund_eligible = now <= cutoff

    return {'allowed': True, 'reason': None, 'refund_eligible': refund_eligible}


def validate_reschedule(booking, new_departure, new_return, now=None):
    """Return an error message if the reschedule is not allowed, else None.

    Rules:
    - Cancelled/Completed/No Show bookings cannot be rescheduled; Started ones can,
      but only the return time may change.
    - Each date can only be changed until RESCHEDULE_MIN_HOURS before its
      current value (per-field cutoff — an untouched field never blocks).
    - Newly picked times must be at least RESCHEDULE_MIN_HOURS from now.
    """
    now = now or timezone.now()
    status_name = booking.status.name.lower() if booking.status else ''

    if status_name in ('cancelled', 'completed', 'no show'):
        return 'Cannot reschedule this booking.'

    departure_changed = not _same_minute(new_departure, booking.departure_time)
    return_changed = not _same_minute(new_return, booking.return_time)

    if not departure_changed and not return_changed:
        return 'No changes were made to the booking times.'

    if status_name == 'started' and departure_changed:
        return 'This booking has already started — only the return date and time can be changed.'

    cutoff = timedelta(hours=RESCHEDULE_MIN_HOURS)
    if departure_changed and now > booking.departure_time - cutoff:
        return f'The departure can only be changed up to {RESCHEDULE_MIN_HOURS} hours before the current departure time.'
    if return_changed and now > booking.return_time - cutoff:
        return f'The return can only be changed up to {RESCHEDULE_MIN_HOURS} hours before the current return time.'

    min_new_time = now + cutoff
    if departure_changed and new_departure < min_new_time:
        return f'The new departure time must be at least {RESCHEDULE_MIN_HOURS} hours from now.'
    if return_changed and new_return < min_new_time:
        return f'The new return time must be at least {RESCHEDULE_MIN_HOURS} hours from now.'

    if new_return <= new_departure:
        return 'The return time must be after the departure time.'

    return None


def compute_reschedule_pricing(booking, new_departure, new_return):
    """Compute pricing for a reschedule.

    Extensions cost RESCHEDULE_DAY_RATE per extra day; reductions leave the
    price unchanged (no refunds or credit for shortened stays).
    """
    prev_days = calculate_parking_days(booking.departure_time, booking.return_time)
    new_days = calculate_parking_days(new_departure, new_return)
    extra_days = new_days - prev_days

    prev_total = Decimal(str(booking.total_price or 0))
    if booking.discounted_price is not None:
        prev_discounted = Decimal(str(booking.discounted_price))
    else:
        prev_discounted = prev_total

    if extra_days > 0:
        extra_amount = RESCHEDULE_DAY_RATE * extra_days
        new_total_price = prev_total + extra_amount
        new_discounted_price = prev_discounted + extra_amount
    else:
        extra_amount = Decimal('0.00')
        new_total_price = prev_total
        new_discounted_price = prev_discounted

    return {
        'prev_days': prev_days,
        'new_days': new_days,
        'extra_days': extra_days,
        'extra_amount': extra_amount,
        'new_total_price': new_total_price,
        'new_discounted_price': new_discounted_price,
    }


def find_succeeded_extra_payment(booking, expected_amount, max_age_minutes=60):
    """Find a recent succeeded payment matching the required extension amount.

    Gates reschedules that need an extra payment: the payment must exist
    before the new dates are applied.
    """
    from payments.models import Payment

    cutoff = timezone.now() - timedelta(minutes=max_age_minutes)
    return (
        Payment.objects.filter(
            booking=booking,
            status__name='Succeeded',
            amount=expected_amount,
            created_at__gte=cutoff,
        )
        .order_by('-created_at')
        .first()
    )
