from rest_framework.permissions import BasePermission

from api.users.roles import is_platform_admin


class IsModerator(BasePermission):
    """
    Project-level moderator/admin check.
    Platform admins (role=admin), legacy is_admin, or Django staff.
    """

    def has_permission(self, request, view):
        return is_platform_admin(getattr(request, "user", None))

