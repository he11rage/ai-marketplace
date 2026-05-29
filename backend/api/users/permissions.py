from rest_framework.permissions import BasePermission

from .roles import UserRole, is_platform_admin, is_seller, user_has_role


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_platform_admin(request.user)


class IsSeller(BasePermission):
    def has_permission(self, request, view):
        return is_seller(request.user)


class IsBuyer(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and getattr(user, "is_authenticated", False)
            and user_has_role(user, UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN)
        )
