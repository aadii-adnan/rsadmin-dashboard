from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import Supplier


User = get_user_model()


class StaffUserSerializer(serializers.ModelSerializer):
    """Explicit staff-facing user fields; credentials and permissions stay private."""

    supplier_id = serializers.IntegerField(source="supplier_profile.id", read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "phone",
            "is_active", "is_manager", "is_supplier", "is_staff", "bonus_points",
            "date_joined", "last_login", "supplier_id",
        ]
        read_only_fields = ["id", "username", "bonus_points", "date_joined", "last_login", "supplier_id"]


class StaffUserWriteSerializer(serializers.ModelSerializer):
    """Role management deliberately excludes superuser/groups/raw permissions."""

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "phone", "is_active", "is_manager", "is_supplier", "is_staff"]

    def validate(self, attrs):
        target = self.instance
        request = self.context["request"]
        if target and target.pk == request.user.pk:
            protected = {"is_active", "is_manager", "is_supplier", "is_staff"}
            if protected.intersection(attrs):
                raise serializers.ValidationError("You cannot change your own staff access.")
        return attrs


class StaffSupplierSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True, default=None)
    username = serializers.CharField(source="user.username", read_only=True, default=None)

    class Meta:
        model = Supplier
        fields = [
            "id", "name", "contact_person", "email", "phone", "website",
            "booking_id_prefix", "commission_percentage", "use_custom_booking_ids",
            "is_active", "created_at", "user_id", "username",
        ]
        read_only_fields = ["id", "created_at", "user_id", "username"]


class StaffSupplierCreateSerializer(StaffSupplierSerializer):
    username = serializers.CharField(write_only=True, max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta(StaffSupplierSerializer.Meta):
        fields = [*StaffSupplierSerializer.Meta.fields, "password"]
        read_only_fields = StaffSupplierSerializer.Meta.read_only_fields

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        username = validated_data.pop("username")
        password = validated_data.pop("password")
        contact_person = validated_data.get("contact_person") or ""
        name_parts = contact_person.split()
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                password=password,
                email=validated_data.get("email") or "",
                is_supplier=True,
                is_staff=True,
                is_manager=False,
                # This mirrors the legacy Django Admin supplier account shape.
                is_superuser=True,
                first_name=name_parts[0] if name_parts else "",
                last_name=" ".join(name_parts[1:]),
            )
            return Supplier.objects.create(user=user, **validated_data)
