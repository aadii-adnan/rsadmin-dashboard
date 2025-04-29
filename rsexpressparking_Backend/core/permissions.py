from rest_framework.permissions import BasePermission

class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (request.user.is_manager or request.user.is_superuser)
