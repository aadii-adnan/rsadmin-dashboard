"""Signed tokens for the guest manage-booking flow.

Stateless: the token embeds the booking_id, signed and timestamped with
django.core.signing — no DB storage needed. Expiry is enforced on load via
settings.MANAGE_BOOKING_TOKEN_MAX_AGE.
"""
from django.conf import settings
from django.core import signing

MANAGE_BOOKING_SALT = 'bookings.manage-booking'


def make_manage_booking_token(booking):
    return signing.dumps({'bid': booking.booking_id}, salt=MANAGE_BOOKING_SALT)


def resolve_manage_booking_token(token):
    """Return the Booking for a valid token.

    Raises signing.SignatureExpired (expired), signing.BadSignature
    (tampered/invalid), or Booking.DoesNotExist.
    """
    from .models import Booking

    data = signing.loads(
        token,
        salt=MANAGE_BOOKING_SALT,
        max_age=settings.MANAGE_BOOKING_TOKEN_MAX_AGE,
    )
    return Booking.objects.select_related('service', 'status').get(booking_id=data['bid'])
