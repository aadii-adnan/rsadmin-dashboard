from rest_framework import serializers
from .models import Expense

class ExpenseSerializer(serializers.ModelSerializer):
    for_month = serializers.DateField(allow_null=True, required=False)
    recurring_start_month = serializers.DateField(allow_null=True, required=False)
    recurring_end_month = serializers.DateField(allow_null=True, required=False)
    website = serializers.CharField(required=True)

    class Meta:
        model = Expense
        fields = '__all__'