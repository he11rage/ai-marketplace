from __future__ import annotations

from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import Product


@receiver(pre_save, sender=Product)
def product_pre_save_capture_original(sender, instance: Product, **kwargs):
    """
    Best-effort original snapshot for audit.
    The main audit is created in the API layer (viewset), but this helps
    when products are saved outside API (e.g. admin) to keep diffs available.
    """
    if not instance.pk:
        instance._original_for_audit = None
        return
    try:
        instance._original_for_audit = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        instance._original_for_audit = None
