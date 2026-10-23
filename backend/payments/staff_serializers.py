from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import CreditTransaction

User = get_user_model()


class StaffCreditTransactionSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    user_name = serializers.SerializerMethodField()
    booking_reference = serializers.CharField(source="booking.booking_id", read_only=True, default=None)

    class Meta:
        model = CreditTransaction
        fields = [
            "id", "user_id", "user_name", "transaction_type", "amount", "balance_after",
            "note", "booking_reference", "status", "website", "created_at",
        ]
        read_only_fields = fields

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class StaffCreditAdjustmentSerializer(serializers.Serializer):
    user_id = serializers.PrimaryKeyRelatedField(source="user", queryset=User.objects.all())
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    note = serializers.CharField(max_length=255, allow_blank=False, trim_whitespace=True)
    website = serializers.ChoiceField(choices=["rsexpressparking", "dublinairportparking"])

    def validate_amount(self, value):
        if value == Decimal("0.00"):
            raise serializers.ValidationError("Amount cannot be zero.")
        return value
