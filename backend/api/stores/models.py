from django.db import models
from django.conf import settings
from pytils.translit import slugify
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Avg, Count


class Store(models.Model):
    """Модель магазина"""
    STATUS_PENDING_MODERATION = 'pending_moderation'
    STATUS_ACTIVE = 'active'
    STATUS_LIMITED = 'limited'
    STATUS_BLOCKED = 'blocked'
    STATUS_REJECTED = 'rejected'

    STATUS_CHOICES = [
        (STATUS_PENDING_MODERATION, 'Pending Moderation'),
        (STATUS_ACTIVE, 'Active'),
        (STATUS_LIMITED, 'Limited'),
        (STATUS_BLOCKED, 'Blocked'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='stores'
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    logo = models.ImageField(upload_to='stores/logos/', blank=True, null=True)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=0.0)
    review_count = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING_MODERATION,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @classmethod
    def recalc_store_stats(cls, store_id: int) -> None:
        """
        Recalculate store rating based on ALL reviews of store products.
        Rating is 1-decimal average across review rows; count is number of reviews.
        """
        # Import here to avoid import cycles.
        from api.reviews.models import Review

        agg = Review.objects.filter(product__store_id=store_id).aggregate(
            avg=Avg("rating"), cnt=Count("id")
        )
        cnt = int(agg["cnt"] or 0)
        avg = agg["avg"]

        if avg is None:
            avg_1dp = Decimal("0.0")
        else:
            avg_1dp = Decimal(str(avg)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)

        cls.objects.filter(id=store_id).update(rating=avg_1dp, review_count=cnt)
    
    
    class Meta:
        db_table = 'stores'
        verbose_name = 'Store'
        verbose_name_plural = 'Stores'

    def __str__(self):
        return self.name