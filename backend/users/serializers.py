from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'phone', 'bonus_points', 'is_superuser']  # Include phone field

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user