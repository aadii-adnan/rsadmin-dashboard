from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    for_month = serializers.DateField(allow_null=True, required=False)
    recurring_start_month = serializers.DateField(allow_null=True, required=False)
    recurring_end_month = serializers.DateField(allow_null=True, required=False)
    website = serializers.ChoiceField(choices=Expense.WEBSITE_CHOICES, required=True)

    class Meta:
        model = Expense
        fields = '__all__'

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def validate(self, attrs):
        instance = self.instance
        recurring = attrs.get(
            "recurring",
            instance.recurring if instance is not None else False,
        )
        for_month = attrs.get(
            "for_month",
            instance.for_month if instance is not None else None,
        )
        start = attrs.get(
            "recurring_start_month",
            instance.recurring_start_month if instance is not None else None,
        )
        end = attrs.get(
            "recurring_end_month",
            instance.recurring_end_month if instance is not None else None,
        )

        if recurring:
            if not start:
                raise serializers.ValidationError({
                    "recurring_start_month": "A recurring start month is required."
                })
            if end and start > end:
                raise serializers.ValidationError({
                    "recurring_end_month": "End month cannot be before the start month."
                })
            attrs["for_month"] = None
        else:
            if not for_month:
                raise serializers.ValidationError({
                    "for_month": "A month is required for a fixed expense."
                })
            attrs["recurring_start_month"] = None
            attrs["recurring_end_month"] = None

        return attrs
