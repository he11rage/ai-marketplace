from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import models, transaction
from django.db.models import Avg, Count

from api.products.models import Product
from api.stores.models import Store


class Review(models.Model):
    STATUS_PENDING_MODERATION = "pending_moderation"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"

    STATUS_CHOICES = [
        (STATUS_PENDING_MODERATION, "Pending Moderation"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    ]

    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="reviews"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews"
    )
    rating = models.PositiveSmallIntegerField()
    text = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING_MODERATION,
        db_index=True,
    )
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moderated_reviews",
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    moderation_note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reviews"
        constraints = [
            models.UniqueConstraint(
                fields=["product", "author"], name="uniq_review_product_author"
            )
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Review({self.product_id}, {self.author_id}, {self.rating})"

    @staticmethod
    def _compute_stats(product_id: int):
        agg = Review.objects.filter(
            product_id=product_id, status=Review.STATUS_APPROVED
        ).aggregate(
            avg=Avg("rating"), cnt=Count("id")
        )
        cnt = int(agg["cnt"] or 0)
        avg = agg["avg"]
        if avg is None:
            return Decimal("0.0"), 0
        # Keep 1 decimal place, half-up (matches typical UX expectations).
        avg_1dp = (
            Decimal(str(avg))
            .quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
        )
        return avg_1dp, cnt

    @classmethod
    def recalc_product_stats(cls, product_id: int) -> None:
        avg_1dp, cnt = cls._compute_stats(product_id)
        Product.objects.filter(id=product_id).update(
            rating=avg_1dp,
            review_count=cnt,
        )
        # Also update store aggregates (rating + review_count).
        store_id = (
            Product.objects.filter(id=product_id)
            .values_list("store_id", flat=True)
            .first()
        )
        if store_id:
            Store.recalc_store_stats(int(store_id))

    def save(self, *args, **kwargs):
        with transaction.atomic():
            super().save(*args, **kwargs)
            type(self).recalc_product_stats(self.product_id)

    def delete(self, *args, **kwargs):
        product_id = self.product_id
        with transaction.atomic():
            result = super().delete(*args, **kwargs)
            type(self).recalc_product_stats(product_id)
            return result

