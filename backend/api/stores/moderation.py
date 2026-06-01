"""Store moderation helpers for seller flows."""

from .models import Store

SELLER_UPDATE_RESUBMIT_STATUSES = frozenset({
    Store.STATUS_ACTIVE,
    Store.STATUS_REJECTED,
    Store.STATUS_LIMITED,
})


def seller_store_update_resets_moderation(store: Store, *, by_admin: bool = False) -> bool:
    """Return True when a seller edit must send the store back to the moderation queue."""
    return not by_admin and store.status in SELLER_UPDATE_RESUBMIT_STATUSES


def seller_store_update_moderation_fields(store: Store, *, by_admin: bool = False) -> dict:
    """
    Extra fields passed to serializer.save() on seller store update.
    Rejected/limited/active stores return to pending_moderation; prior moderation metadata is cleared.
    """
    if not seller_store_update_resets_moderation(store, by_admin=by_admin):
        return {}
    return {
        "status": Store.STATUS_PENDING_MODERATION,
        "moderated_by": None,
        "moderated_at": None,
        "moderation_reason": "",
    }
