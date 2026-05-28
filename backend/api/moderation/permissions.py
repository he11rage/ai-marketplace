from rest_framework.permissions import BasePermission


class IsModerator(BasePermission):
    """
    Project-level "moderator/admin" check.
    We treat either Django staff or CustomUser.is_admin as moderator privileges.
    """

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(
            user
            and getattr(user, "is_authenticated", False)
            and (getattr(user, "is_staff", False) or getattr(user, "is_admin", False))
        )

