from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView
from core.permissions import IsFullSuperAdmin
from .models import ContactMessage
from rest_framework import serializers

class StaffContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'website', 'message', 'timestamp']
        read_only_fields = fields

class StaffContactMessagesView(APIView):
    permission_classes = [IsFullSuperAdmin]
    def get(self, request):
        query = request.query_params.get('search', '').strip()
        records = ContactMessage.objects.all().order_by('-timestamp')
        if query:
            records = records.filter(Q(first_name__icontains=query) | Q(last_name__icontains=query) | Q(email__icontains=query) | Q(phone__icontains=query))
        return Response(StaffContactSerializer(records[:200], many=True).data)
