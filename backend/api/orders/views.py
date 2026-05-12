from rest_framework import viewsets, permissions, serializers
from rest_framework.decorators import action
from django.db import transaction
from .models import Order, OrderItem
from .serializers import OrderSerializer
from api.cart.models import Cart, CartItem
from api.products.models import Product

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Юзер видит только свои заказы
        return Order.objects.filter(buyer=self.request.user).prefetch_related('items')

    @transaction.atomic
    def perform_create(self, serializer):
        user = self.request.user
        cart = Cart.objects.get(user=user)
        
        cart_items = cart.items.filter(selected=True)
        
        if not cart_items.exists():
            raise serializers.ValidationError("Нет выбранных товаров для заказа")

        order = serializer.save(buyer=user, status='created')
        total_price = 0.0

        for cart_item in cart_items:
            product = cart_item.product
            
            if product.stock_quantity < cart_item.quantity:
                raise serializers.ValidationError(f"Недостаточно товара: {product.name}")
            
            product.stock_quantity -= cart_item.quantity
            product.save()
            
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=cart_item.quantity,
                price=product.price
            )
            total_price += product.price * cart_item.quantity

        order.total_price = total_price
        order.save()
        
        cart_items.delete()