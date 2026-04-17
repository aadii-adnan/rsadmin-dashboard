from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    GENERIC_FORGOT_PASSWORD_MESSAGE,
    ForgotPasswordSerializer,
    RegisterSerializer,
    ResetPasswordConfirmSerializer,
    ResetPasswordTokenSerializer,
)
from .tasks import send_password_reset_email_task

User = get_user_model()
PASSWORD_RESET_TOKEN_GENERATOR = PasswordResetTokenGenerator()


def _resolve_website(raw_website, request_host):
    website_value = (raw_website or "").strip().lower()
    host_value = (request_host or "").lower()

    dublin_markers = {
        "dublin",
        "dublinairportparking",
        "dublinairportexpressparking",
        "dublinairportexpressparking.ie",
        "www.dublinairportexpressparking.ie",
    }

    if website_value in dublin_markers or "dublinairportexpressparking" in website_value:
        return "dublinairportparking"
    if "dublinairport" in host_value:
        return "dublinairportparking"
    return "rsexpressparking"


def _get_user_from_uid(uid):
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        return User.objects.get(pk=user_id)
    except (TypeError, ValueError, OverflowError, UnicodeDecodeError, User.DoesNotExist):
        return None

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "User created successfully."}, status=status.HTTP_201_CREATED)
        
        # Check for specific errors
        errors = serializer.errors
        if "username" in errors and "already exists" in str(errors["username"]):
            return Response({"errors": errors}, status=status.HTTP_409_CONFLICT)
        
        # Return other validation errors with 400 status
        return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].strip().lower()
        website = _resolve_website(
            serializer.validated_data.get("website"),
            request.get_host(),
        )

        user = User.objects.filter(email__iexact=email).first()

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = PASSWORD_RESET_TOKEN_GENERATOR.make_token(user)
            send_password_reset_email_task.delay(
                user.id,
                uid,
                token,
                website,
            )

        return Response(
            {"message": GENERIC_FORGOT_PASSWORD_MESSAGE},
            status=status.HTTP_200_OK,
        )


class ValidateResetPasswordTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        serializer = ResetPasswordTokenSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(
                {
                    "valid": False,
                    "message": "Invalid reset link.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]

        user = _get_user_from_uid(uid)
        if not user or not PASSWORD_RESET_TOKEN_GENERATOR.check_token(user, token):
            return Response(
                {"valid": False, "message": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"valid": True, "message": "Reset link is valid."},
            status=status.HTTP_200_OK,
        )


class ConfirmResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        user = _get_user_from_uid(uid)
        if not user or not PASSWORD_RESET_TOKEN_GENERATOR.check_token(user, token):
            return Response(
                {"message": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response(
                {"new_password": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response(
            {"message": "Password has been reset successfully."},
            status=status.HTTP_200_OK,
        )

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "is_manager": user.is_manager,
            "bonus_points": str(user.bonus_points),  # Convert Decimal to string for JSON serialization
            "is_superuser": user.is_superuser
        })
    

class AddBonusPointsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            amount = request.data.get("amount")
            if amount is None:
                return Response({"error": "Amount is required."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                amount = Decimal(str(amount))
            except Exception:
                return Response({"error": "Invalid amount."}, status=status.HTTP_400_BAD_REQUEST)
            if amount <= 0:
                return Response({"error": "Amount must be positive."}, status=status.HTTP_400_BAD_REQUEST)

            user = request.user
            user.bonus_points += amount
            user.save(update_fields=["bonus_points"])
            return Response({"message": f"Added {amount} bonus points.", "bonus_points": str(user.bonus_points)})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
