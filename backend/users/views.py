from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .serializers import RegisterSerializer
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()

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
