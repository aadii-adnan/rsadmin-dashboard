from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from core.permissions import IsFullSuperAdmin
from .models import RedirectRule

class StaffRedirectSerializer(serializers.ModelSerializer):
    class Meta: model = RedirectRule; fields = ['id', 'old_path', 'new_path', 'status_code', 'is_active']; read_only_fields = ['id']
    def validate_old_path(self, value):
        if not value.startswith('/'): raise serializers.ValidationError('Old path must start with /.')
        return value
class StaffRedirectsView(APIView):
    permission_classes = [IsFullSuperAdmin]
    def get(self, request): return Response(StaffRedirectSerializer(RedirectRule.objects.all().order_by('old_path'), many=True).data)
    def post(self, request):
        serializer = StaffRedirectSerializer(data=request.data); serializer.is_valid(raise_exception=True); item = serializer.save()
        return Response(StaffRedirectSerializer(item).data, status=status.HTTP_201_CREATED)
class StaffRedirectDetailView(APIView):
    permission_classes = [IsFullSuperAdmin]
    def patch(self, request, rule_id):
        item = get_object_or_404(RedirectRule, pk=rule_id); serializer = StaffRedirectSerializer(item, data=request.data, partial=True); serializer.is_valid(raise_exception=True); serializer.save()
        return Response(StaffRedirectSerializer(item).data)
