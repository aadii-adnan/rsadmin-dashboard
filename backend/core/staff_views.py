from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BookingSettings, Status
from .permissions import IsFullSuperAdmin
from .staff_serializers import StaffBookingSettingsSerializer, StaffStatusSerializer


class StaffStatusesView(APIView):
    permission_classes = [IsFullSuperAdmin]

    def get(self, request):
        return Response(StaffStatusSerializer(Status.objects.all().order_by("type", "name"), many=True).data)

    def post(self, request):
        serializer = StaffStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(StaffStatusSerializer(item).data, status=status.HTTP_201_CREATED)


class StaffStatusDetailView(APIView):
    permission_classes = [IsFullSuperAdmin]

    def patch(self, request, status_id):
        item = get_object_or_404(Status, pk=status_id)
        serializer = StaffStatusSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(StaffStatusSerializer(item).data)


class StaffBookingSettingsView(APIView):
    permission_classes = [IsFullSuperAdmin]

    def get(self, request):
        settings = BookingSettings.objects.first()
        if settings is None:
            return Response({"detail": "Booking settings have not been configured."}, status=status.HTTP_404_NOT_FOUND)
        return Response(StaffBookingSettingsSerializer(settings).data)

    def put(self, request):
        settings, _ = BookingSettings.objects.get_or_create()
        serializer = StaffBookingSettingsSerializer(settings, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(StaffBookingSettingsSerializer(settings).data)
