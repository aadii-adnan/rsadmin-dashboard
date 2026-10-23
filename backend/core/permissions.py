from rest_framework.permissions import BasePermission


def is_active_supplier(user):
    """Return whether a user has an active, linked supplier profile."""
    supplier_profile = getattr(user, 'supplier_profile', None)
    return bool(
        getattr(user, 'is_authenticated', False)
        and getattr(user, 'is_supplier', False)
        and supplier_profile
        and supplier_profile.is_active
    )


def is_full_super_admin(user):
    """Return whether a user has the unrestricted operations-admin role.

    This deliberately matches the existing finance dashboard definition: a
    superuser who is also marked as a manager or supplier is not treated as a
    full super-admin.
    """
    return bool(
        getattr(user, 'is_authenticated', False)
        and getattr(user, 'is_superuser', False)
        and not getattr(user, 'is_manager', False)
        and not getattr(user, 'is_supplier', False)
    )


def can_access_staff_dashboard(user):
    """Return whether the user has any supported operations-dashboard role."""
    return bool(
        is_full_super_admin(user)
        or getattr(user, 'is_manager', False)
        or is_active_supplier(user)
    )


class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (request.user.is_manager or request.user.is_superuser)


class IsSupplier(BasePermission):
    def has_permission(self, request, view):
        return is_active_supplier(request.user)


class IsFullSuperAdmin(BasePermission):
    """Allow only the unrestricted super-admin role used by finance."""

    def has_permission(self, request, view):
        return is_full_super_admin(request.user)


class IsStaffDashboardUser(BasePermission):
    """Allow full super-admins, managers, and active suppliers.

    Future staff dashboard endpoints should use this as their baseline
    permission and additionally apply queryset/object-level role scoping.
    """

    def has_permission(self, request, view):
        return can_access_staff_dashboard(request.user)
