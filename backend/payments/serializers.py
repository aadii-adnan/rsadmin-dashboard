from rest_framework import serializers
from .models import Payment, CreditTransaction

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret.pop('client_request_id', None)
        return ret


class CreditTransactionSerializer(serializers.ModelSerializer):
    booking_reference = serializers.CharField(source='booking.booking_id', read_only=True, default=None)
    has_invoice = serializers.SerializerMethodField()

    class Meta:
        model = CreditTransaction
        fields = [
            'id',
            'transaction_type',
            'amount',
            'balance_after',
            'note',
            'booking_reference',
            'status',
            'created_at',
            'has_invoice',
        ]

    def get_has_invoice(self, obj):
        return (
            obj.transaction_type == CreditTransaction.TYPE_TOPUP
            and obj.status == CreditTransaction.STATUS_SUCCEEDED
        )
