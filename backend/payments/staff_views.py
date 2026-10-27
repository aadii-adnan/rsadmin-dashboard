from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsFullSuperAdmin
from .models import CreditTransaction
from .staff_serializers import StaffCreditAdjustmentSerializer, StaffCreditTransactionSerializer

User = get_user_model()


class StaffCreditLedgerView(APIView):
    """Read-only audit ledger plus one explicit, atomic adjustment operation."""
    permission_classes = [IsFullSuperAdmin]

    def get(self, request):
        transactions = CreditTransaction.objects.select_related("user", "booking").all()[:200]
        return Response(StaffCreditTransactionSerializer(transactions, many=True).data)

    def post(self, request):
        serializer = StaffCreditAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=values["user"].pk)
            current_balance = user.bonus_points or Decimal("0.00")
            new_balance = current_balance + values["amount"]
            if new_balance < 0:
                return Response({"amount": ["This deduction would make the credit balance negative."]}, status=status.HTTP_400_BAD_REQUEST)
            user.bonus_points = new_balance
            user.save(update_fields=["bonus_points"])
            entry = CreditTransaction.objects.create(
                user=user,
                transaction_type=CreditTransaction.TYPE_ADJUSTMENT,
                amount=values["amount"],
                balance_after=new_balance,
                note=values["note"],
                website=values["website"],
                status=CreditTransaction.STATUS_SUCCEEDED,
            )
        return Response(StaffCreditTransactionSerializer(entry).data, status=status.HTTP_201_CREATED)


class StaffCreditTransactionDetailView(APIView):
    """Read one immutable credit-ledger entry for the operations dashboard."""

    permission_classes = [IsFullSuperAdmin]

    def get(self, request, transaction_id):
        entry = get_object_or_404(
            CreditTransaction.objects.select_related("user", "booking"),
            pk=transaction_id,
        )
        return Response(StaffCreditTransactionSerializer(entry).data)
