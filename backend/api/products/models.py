from django.db import models
from pgvector.django import VectorField
from api.stores.models import Store
from api.categories.models import Category

from ml.embeddings import get_embedding


class Product(models.Model):
    """Модель товара с векторным эмбеддингом для ML-поиска"""

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
        if not self.embedding:
            text = f"{self.name} {self.description}"
            print(f"Generating embedding for: {self.name}")
            self.embedding = get_embedding(text)

        super().save(*args, **kwargs)
