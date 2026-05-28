from django.conf import settings
from django.db import models
from django.db.models import Q

from api.products.models import Product
from api.reviews.models import Review
from api.stores.models import Store


class Report(models.Model):
    TARGET_REVIEW = "review"
    TARGET_PRODUCT = "product"
    TARGET_STORE = "store"

    TARGET_CHOICES = [
        (TARGET_REVIEW, "Review"),
        (TARGET_PRODUCT, "Product"),
        (TARGET_STORE, "Store"),
    ]

    STATUS_OPEN = "open"
    STATUS_RESOLVED = "resolved"
    STATUS_REJECTED = "rejected"

    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_RESOLVED, "Resolved"),
        (STATUS_REJECTED, "Rejected"),
    ]

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    target_type = models.CharField(max_length=16, choices=TARGET_CHOICES)
    review = models.ForeignKey(
        Review, null=True, blank=True, on_delete=models.CASCADE, related_name="reports"
    )
    product = models.ForeignKey(
        Product, null=True, blank=True, on_delete=models.CASCADE, related_name="reports"
    )
    store = models.ForeignKey(
        Store, null=True, blank=True, on_delete=models.CASCADE, related_name="reports"
    )

    reason = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")

    status = models.CharField(
        max_length=16, choices=STATUS_CHOICES, default=STATUS_OPEN, db_index=True
    )
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="handled_reports",
    )
    handled_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reports"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                name="report_exactly_one_target",
                check=(
                    # exactly one of review/product/store is set
                    (Q(review__isnull=False) & Q(product__isnull=True) & Q(store__isnull=True))
                    | (Q(review__isnull=True) & Q(product__isnull=False) & Q(store__isnull=True))
                    | (Q(review__isnull=True) & Q(product__isnull=True) & Q(store__isnull=False))
                ),
            )
        ]

    def __str__(self) -> str:
        return f"Report({self.target_type}, {self.status}, by={self.reporter_id})"

