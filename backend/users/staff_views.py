from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsFullSuperAdmin
from .models import Supplier
from .staff_serializers import (
    StaffSupplierCreateSerializer, StaffSupplierSerializer, StaffUserSerializer, StaffUserWriteSerializer,
)

User = get_user_model()


class StaffUsersView(APIView):
    permission_classes = [IsFullSuperAdmin]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        users = User.objects.select_related("supplier_profile").order_by("-date_joined")
        if search:
            users = users.filter(Q(username__icontains=search) | Q(email__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search))
        return Response(StaffUserSerializer(users[:200], many=True).data)


class StaffUserDetailView(APIView):
    permission_classes = [IsFullSuperAdmin]

    def patch(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        serializer = StaffUserWriteSerializer(user, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(StaffUserSerializer(user).data)


class StaffSuppliersView(APIView):
    permission_classes = [IsFullSuperAdmin]

    def get(self, request):
        return Response(StaffSupplierSerializer(Supplier.objects.select_related("user").order_by("name"), many=True).data)

    def post(self, request):
        serializer = StaffSupplierCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        supplier = serializer.save()
        return Response(StaffSupplierSerializer(supplier).data, status=status.HTTP_201_CREATED)


class StaffSupplierDetailView(APIView):
    permission_classes = [IsFullSuperAdmin]

    def patch(self, request, supplier_id):
        supplier = get_object_or_404(Supplier.objects.select_related("user"), pk=supplier_id)
        serializer = StaffSupplierSerializer(supplier, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(StaffSupplierSerializer(supplier).data)
