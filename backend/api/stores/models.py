from django.db import models
from django.conf import settings
from pytils.translit import slugify


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
    
    
    class Meta:
        db_table = 'stores'
        verbose_name = 'Store'
        verbose_name_plural = 'Stores'

    def __str__(self):
        return self.name