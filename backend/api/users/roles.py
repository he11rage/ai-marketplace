from django.db import models


class UserRole(models.TextChoices):
    BUYER = "buyer", "Покупатель"
    SELLER = "seller", "Продавец"
    ADMIN = "admin", "Администратор"


def user_has_role(user, *roles):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    return getattr(user, "role", None) in roles


def is_platform_admin(user):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    return (
        user_has_role(user, UserRole.ADMIN)
        or getattr(user, "is_admin", False)
        or getattr(user, "is_staff", False)
    )


def is_admin_editing_other_users_resource(user, owner_id):
    """True when a platform admin edits someone else's resource (not their own seller content)."""
    if not user or not getattr(user, "is_authenticated", False):
        return False
    return is_platform_admin(user) and owner_id != user.id


def is_seller(user):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    return user_has_role(user, UserRole.SELLER, UserRole.ADMIN) or is_platform_admin(user)


def is_buyer(user):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    return user_has_role(user, UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN)
