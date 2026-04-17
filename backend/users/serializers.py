from rest_framework import serializers
from django.contrib.auth import get_user_model

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