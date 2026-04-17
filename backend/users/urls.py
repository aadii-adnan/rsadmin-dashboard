from django.urls import path
from .views import (
    AddBonusPointsView,
    ConfirmResetPasswordView,
    CurrentUserView,
    ForgotPasswordView,
    RegisterView,
    ValidateResetPasswordTokenView,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('add-bonus/', AddBonusPointsView.as_view(), name='add-bonus-points'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/validate/', ValidateResetPasswordTokenView.as_view(), name='reset-password-validate'),
    path('reset-password/confirm/', ConfirmResetPasswordView.as_view(), name='reset-password-confirm'),
]
