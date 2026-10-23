from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from core.permissions import IsFullSuperAdmin
from .models import FAQ, FAQCategory

class StaffFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ['id', 'category', 'question', 'answer', 'is_dynamic', 'dynamic_type']
        read_only_fields = ['id']
    def validate(self, attrs):
        if attrs.get('is_dynamic') and not attrs.get('dynamic_type', getattr(self.instance, 'dynamic_type', '')):
            raise serializers.ValidationError({'dynamic_type': 'Choose a dynamic type when dynamic content is enabled.'})
        return attrs

class StaffFAQsView(APIView):
    permission_classes = [IsFullSuperAdmin]
    def get(self, request): return Response(StaffFAQSerializer(FAQ.objects.select_related('category').all().order_by('id'), many=True).data)
    def post(self, request):
        serializer = StaffFAQSerializer(data=request.data); serializer.is_valid(raise_exception=True); item = serializer.save()
        return Response(StaffFAQSerializer(item).data, status=status.HTTP_201_CREATED)

class StaffFAQDetailView(APIView):
    permission_classes = [IsFullSuperAdmin]
    def patch(self, request, faq_id):
        item = get_object_or_404(FAQ, pk=faq_id); serializer = StaffFAQSerializer(item, data=request.data, partial=True); serializer.is_valid(raise_exception=True); serializer.save()
        return Response(StaffFAQSerializer(item).data)
