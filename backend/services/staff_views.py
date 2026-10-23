from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsFullSuperAdmin
from .models import AddOn, Coupon, Service
from .staff_serializers import StaffAddOnSerializer, StaffCouponSerializer, StaffServiceSerializer


class StaffModelCollectionView(APIView):
    permission_classes = [IsFullSuperAdmin]
    model = None
    serializer_class = None
    ordering = "id"

    def get(self, request):
        return Response(self.serializer_class(self.model.objects.all().order_by(self.ordering), many=True).data)

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(self.serializer_class(instance).data, status=status.HTTP_201_CREATED)


class StaffModelDetailView(APIView):
    permission_classes = [IsFullSuperAdmin]
    model = None
    serializer_class = None

    def patch(self, request, object_id):
        instance = get_object_or_404(self.model, pk=object_id)
        serializer = self.serializer_class(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(self.serializer_class(instance).data)


class StaffServicesView(StaffModelCollectionView):
    model, serializer_class, ordering = Service, StaffServiceSerializer, "order"


class StaffServiceDetailView(StaffModelDetailView):
    model, serializer_class = Service, StaffServiceSerializer


class StaffAddOnsView(StaffModelCollectionView):
    model, serializer_class = AddOn, StaffAddOnSerializer


class StaffAddOnDetailView(StaffModelDetailView):
    model, serializer_class = AddOn, StaffAddOnSerializer


class StaffCouponsView(StaffModelCollectionView):
    model, serializer_class, ordering = Coupon, StaffCouponSerializer, "-valid_from"


class StaffCouponDetailView(StaffModelDetailView):
    model, serializer_class = Coupon, StaffCouponSerializer
