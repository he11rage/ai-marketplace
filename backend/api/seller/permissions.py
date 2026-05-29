from rest_framework.permissions import BasePermission

from api.users.roles import is_seller


class IsSeller(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_seller(request.user))
