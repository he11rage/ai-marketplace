from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsStoreOwnerOrAdminOrReadOnly(BasePermission):
    """
    Allow public reads, but restrict store writes to the owner or an admin user.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (obj.owner_id == user.id or getattr(user, "is_admin", False) or user.is_staff)
        )
