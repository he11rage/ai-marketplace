from decimal import Decimal
from rest_framework import viewsets, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import Order, OrderItem
from .serializers import OrderSerializer
from api.cart.models import Cart

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(buyer=self.request.user).prefetch_related('items')

    @transaction.atomic
    def perform_create(self, serializer):
        user = self.request.user
        cart = Cart.objects.get(user=user)
        
        # Use only selected cart items.
        cart_items = cart.items.filter(selected=True)
        
        if not cart_items.exists():
            raise serializers.ValidationError("Нет выбранных товаров для заказа")

        
        total_amount = Decimal('0')
        for cart_item in cart_items:
            total_amount += cart_item.product.price * cart_item.quantity

        # Create order with precomputed total.
        payment_method = serializer.validated_data.get('payment_method', 'card')
        initial_status = 'confirmed' if payment_method == 'cash' else 'created'
        order = serializer.save(buyer=user, status=initial_status, total_amount=total_amount)

        # Decrease stock and create order line items.
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

        # Remove only selected items from the cart.
        cart_items.delete()

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()

        if order.status != 'created':
            return Response(
                {'detail': 'Отменить можно только заказ со статусом created.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'cancelled'
        order.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        order = self.get_object()

        if order.status != 'created':
            return Response(
                {'detail': 'Оплатить можно только заказ со статусом created.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'confirmed'
        order.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['patch'])
    def update_delivery_address(self, request, pk=None):
        order = self.get_object()

        if order.status != 'created':
            return Response(
                {'detail': 'Изменить адрес можно только для заказа со статусом created.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        delivery_address = (request.data.get('delivery_address') or '').strip()
        if not delivery_address:
            return Response(
                {'detail': 'delivery_address обязателен.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.delivery_address = delivery_address
        order.save(update_fields=['delivery_address', 'updated_at'])
        return Response(self.get_serializer(order).data)