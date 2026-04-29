from django.db import models
from django.conf import settings
from api.products.models import Product

class Cart(models.Model):
    """Корзина пользователя"""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cart'

    def __str__(self):
        return f"Cart for {self.user.username}"

class CartItem(models.Model):
    """Элемент корзины"""
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='cart_items'
    )
    quantity = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cart_items'

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"