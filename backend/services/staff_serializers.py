from rest_framework import serializers

from .models import AddOn, Coupon, Service


class StaffServiceSerializer(serializers.ModelSerializer):
    """Configuration contract: image uploads remain in Django Admin for now."""
    class Meta:
        model = Service
        fields = ["id", "name", "slug", "description", "long_description", "is_featured", "base_price", "per_day_price", "order", "enabled", "website"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        for field in ("base_price", "per_day_price"):
            if field in attrs and attrs[field] < 0:
                raise serializers.ValidationError({field: "Price cannot be negative."})
        return attrs


class StaffAddOnSerializer(serializers.ModelSerializer):
    class Meta:
        model = AddOn
        fields = ["id", "name", "price", "description", "active"]
        read_only_fields = ["id"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value


class StaffCouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ["id", "code", "discount_percent", "active", "valid_from", "valid_to", "lifetime", "max_uses", "times_used", "minimum_order_value"]
        read_only_fields = ["id", "times_used"]

    def validate_discount_percent(self, value):
        if not 1 <= value <= 100:
            raise serializers.ValidationError("Discount percent must be between 1 and 100.")
        return value

    def validate_max_uses(self, value):
        if value < 1:
            raise serializers.ValidationError("Maximum uses must be at least 1.")
        return value

    def validate_minimum_order_value(self, value):
        if value < 0:
            raise serializers.ValidationError("Minimum order value cannot be negative.")
        return value

    def validate(self, attrs):
        lifetime = attrs.get("lifetime", getattr(self.instance, "lifetime", False))
        valid_from = attrs.get("valid_from", getattr(self.instance, "valid_from", None))
        valid_to = attrs.get("valid_to", getattr(self.instance, "valid_to", None))
        if not lifetime and valid_to and valid_from and valid_to < valid_from:
            raise serializers.ValidationError({"valid_to": "Valid-to must be on or after valid-from."})
        return attrs
