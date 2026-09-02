from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction

from payments.models import CreditTransaction


def get_booking_cancellation_amount(booking):
    """Return the booking value that can be returned after cancellation."""
    amount = (
        booking.discounted_price
        if booking.discounted_price and booking.discounted_price > 0
        else booking.total_price
    )
    return max(Decimal('0.00'), Decimal(str(amount)))


def credit_cancellation_points(booking, user):
    """Credit the full booking value as points and return the new balance.

    A cancellation returned as points has no cancellation fee. The ledger
    lookup also makes the operation safe to retry without issuing the same
    booking credit twice.
    """
    amount = get_booking_cancellation_amount(booking)
    User = get_user_model()

    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        existing = CreditTransaction.objects.filter(
            user=locked_user,
            booking=booking,
            transaction_type=CreditTransaction.TYPE_CANCELLATION_REFUND,
            status=CreditTransaction.STATUS_SUCCEEDED,
        ).first()

        if not existing and amount > 0:
            locked_user.bonus_points = (
                locked_user.bonus_points or Decimal('0.00')
            ) + amount
            locked_user.save(update_fields=['bonus_points'])
            CreditTransaction.objects.create(
                user=locked_user,
                transaction_type=CreditTransaction.TYPE_CANCELLATION_REFUND,
                amount=amount,
                balance_after=locked_user.bonus_points,
                booking=booking,
                status=CreditTransaction.STATUS_SUCCEEDED,
                website=getattr(booking, 'website', None) or 'rsexpressparking',
            )

        return locked_user.bonus_points, amount
