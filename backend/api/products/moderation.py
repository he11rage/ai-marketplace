"""Product moderation helpers for seller flows."""

from .models import Product


def seller_update_resets_moderation(product: Product, *, by_admin: bool = False) -> bool:
    """Return True when a seller edit of an active product must re-enter moderation."""
    return not by_admin and product.status == Product.STATUS_ACTIVE


def seller_update_moderation_fields(product: Product, *, by_admin: bool = False) -> dict:
    """
    Extra fields passed to serializer.save() on seller product update.
    Active products go back to the moderation queue; prior moderation metadata is cleared.
    """
    if not seller_update_resets_moderation(product, by_admin=by_admin):
        return {}
    return {
        "status": Product.STATUS_PENDING_MODERATION,
        "moderated_by": None,
        "moderated_at": None,
        "moderation_reason": "",
    }
