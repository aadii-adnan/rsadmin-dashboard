from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from core.permissions import IsFullSuperAdmin
from .models import MarketingLead, UnsubscribedEmail

class LeadSerializer(serializers.ModelSerializer):
    class Meta: model = MarketingLead; fields = ['id', 'email', 'discount_code', 'subscribed', 'created_at']; read_only_fields = fields
class UnsubscribeSerializer(serializers.ModelSerializer):
    class Meta: model = UnsubscribedEmail; fields = ['email', 'unsubscribed_at']; read_only_fields = fields
class StaffMarketingLeadsView(APIView):
    permission_classes = [IsFullSuperAdmin]
    def get(self, request): return Response(LeadSerializer(MarketingLead.objects.all().order_by('-created_at')[:200], many=True).data)
class StaffUnsubscribesView(APIView):
    permission_classes = [IsFullSuperAdmin]
    def get(self, request): return Response(UnsubscribeSerializer(UnsubscribedEmail.objects.all().order_by('-unsubscribed_at')[:200], many=True).data)
