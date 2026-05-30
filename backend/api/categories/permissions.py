from rest_framework.permissions import SAFE_METHODS, BasePermission

from api.users.roles import is_platform_admin, is_seller


class CategoryPermissions(BasePermission):
    """
    Public read access to verified categories.
    Sellers can create categories (pending verification).
    Only admins can update or delete categories.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method == "POST":
            return is_seller(user) or is_platform_admin(user)

        return is_platform_admin(user)
