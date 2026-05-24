from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAdminOrReadOnly(BasePermission):
    """
    Allow public category reads, but only admin users can manage categories.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (getattr(user, "is_admin", False) or user.is_staff)
        )
