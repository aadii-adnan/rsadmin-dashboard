from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.permissions import (
    can_access_staff_dashboard,
    is_active_supplier,
    is_full_super_admin,
)

User = get_user_model()

GENERIC_FORGOT_PASSWORD_MESSAGE = (
    "If an account with this email exists, password reset instructions have been sent."
)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'phone', 'bonus_points', 'is_superuser']  # Include phone field

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class CurrentUserSerializer(serializers.ModelSerializer):
    """The minimum profile and capability data needed by the React client."""

    is_active_supplier = serializers.SerializerMethodField()
    is_full_super_admin = serializers.SerializerMethodField()
    can_access_staff_dashboard = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'phone',
            'is_manager',
            'is_superuser',
            'is_supplier',
            'bonus_points',
            'is_active_supplier',
            'is_full_super_admin',
            'can_access_staff_dashboard',
        ]
        read_only_fields = fields

    def get_is_active_supplier(self, user):
        return is_active_supplier(user)

    def get_is_full_super_admin(self, user):
        return is_full_super_admin(user)

    def get_can_access_staff_dashboard(self, user):
        return can_access_staff_dashboard(user)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    website = serializers.CharField(required=False, allow_blank=True, max_length=100)


class ResetPasswordTokenSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()


class ResetPasswordConfirmSerializer(ResetPasswordTokenSerializer):
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs
