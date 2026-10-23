from django.urls import path
from .views import (
    ConfirmResetPasswordView,
    CurrentUserView,
    ForgotPasswordView,
    RegisterView,
    ValidateResetPasswordTokenView,
)
from .staff_views import StaffSupplierDetailView, StaffSuppliersView, StaffUserDetailView, StaffUsersView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/validate/', ValidateResetPasswordTokenView.as_view(), name='reset-password-validate'),
    path('reset-password/confirm/', ConfirmResetPasswordView.as_view(), name='reset-password-confirm'),
    path('staff/users/', StaffUsersView.as_view(), name='staff-users'),
    path('staff/users/<int:user_id>/', StaffUserDetailView.as_view(), name='staff-user-detail'),
    path('staff/suppliers/', StaffSuppliersView.as_view(), name='staff-suppliers'),
    path('staff/suppliers/<int:supplier_id>/', StaffSupplierDetailView.as_view(), name='staff-supplier-detail'),
]
