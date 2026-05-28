from django.db import models
from pgvector.django import VectorField
from api.stores.models import Store
from api.categories.models import Category
from django.conf import settings

from ml.embeddings import get_embedding


class Product(models.Model):
    """Product model with vector embeddings for ML search."""

    STATUS_DRAFT = "draft"
    STATUS_PENDING_MODERATION = "pending_moderation"
    STATUS_ACTIVE = "active"
    STATUS_REJECTED = "rejected"
    STATUS_BLOCKED = "blocked"
    STATUS_ARCHIVED = "archived"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_PENDING_MODERATION, "Pending Moderation"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_BLOCKED, "Blocked"),
        (STATUS_ARCHIVED, "Archived"),
    ]

    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="products")
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, related_name="products"
    )
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    old_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    brand = models.CharField(max_length=100, blank=True, null=True)
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    stock_quantity = models.IntegerField(default=0)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=0.0)
    review_count = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING_MODERATION,
    )
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moderated_products",
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    moderation_reason = models.TextField(blank=True, default="")
    embedding = VectorField(dimensions=1024, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "products"
        verbose_name = "Product"
        verbose_name_plural = "Products"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.embedding is None:
            text = f"{self.name} {self.description}"
            print(f"Generating embedding for: {self.name}")
            self.embedding = get_embedding(text)

        super().save(*args, **kwargs)


class ProductQuestion(models.Model):
    STATUS_OPEN = "open"
    STATUS_ANSWERED = "answered"
    STATUS_HIDDEN = "hidden"

    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_ANSWERED, "Answered"),
        (STATUS_HIDDEN, "Hidden"),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="questions")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="product_questions",
    )
    guest_name = models.CharField(max_length=120, blank=True, null=True)
    guest_email = models.EmailField(blank=True, null=True)
    question = models.TextField()
    answer = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "product_questions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Q{self.pk} for {self.product_id}"


class ProductChangeLog(models.Model):
    ACTION_CREATE = "create"
    ACTION_UPDATE = "update"
    ACTION_DELETE = "delete"

    ACTION_CHOICES = [
        (ACTION_CREATE, "Create"),
        (ACTION_UPDATE, "Update"),
        (ACTION_DELETE, "Delete"),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="change_logs")
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="product_change_logs",
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "product_change_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} product={self.product_id} at {self.created_at}"


class WishlistItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='wishlist_items'
    )
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')
        ordering = ['-added_at']  # Keep newest wishlist items first.

    def __str__(self):
        return f"{self.user.username} -> {self.product.name}"