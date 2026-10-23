from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from core.permissions import IsFullSuperAdmin
from .models import Payment

class StaffPaymentSerializer(serializers.ModelSerializer):
    booking_id = serializers.CharField(source='booking.booking_id', read_only=True)
    customer = serializers.SerializerMethodField()
    status_name = serializers.CharField(source='status.name', read_only=True, default=None)
    class Meta:
        model = Payment
        fields = ['id', 'booking_id', 'customer', 'amount', 'status_name', 'status_message', 'created_at']
        read_only_fields = fields
    def get_customer(self, obj): return f'{obj.booking.first_name} {obj.booking.last_name}'.strip()

class StaffPaymentsView(APIView):
    permission_classes = [IsFullSuperAdmin]
    def get(self, request):
        records = Payment.objects.select_related('booking', 'status').order_by('-created_at')
        status_id = request.query_params.get('status'); query = request.query_params.get('search', '').strip()
        if status_id: records = records.filter(status_id=status_id)
        if query: records = records.filter(Q(booking__booking_id__icontains=query) | Q(booking__email__icontains=query) | Q(stripe_payment_intent__icontains=query))
        return Response(StaffPaymentSerializer(records[:200], many=True).data)

class StaffPaymentDetailView(APIView):
    permission_classes = [IsFullSuperAdmin]
    def get(self, request, payment_id):
        # The serializer intentionally excludes Stripe IDs/customer IDs and client request IDs.
        return Response(StaffPaymentSerializer(get_object_or_404(Payment.objects.select_related('booking', 'status'), pk=payment_id)).data)
