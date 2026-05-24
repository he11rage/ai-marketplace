from decimal import Decimal
from rest_framework import viewsets, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view, inline_serializer
from .models import Order, OrderItem
from .serializers import OrderSerializer
from api.cart.models import Cart
from api.products.models import Product

@extend_schema_view(
    list=extend_schema(tags=["orders"]),
    retrieve=extend_schema(tags=["orders"]),
    create=extend_schema(tags=["orders"]),
    update=extend_schema(tags=["orders"]),
    partial_update=extend_schema(tags=["orders"]),
    destroy=extend_schema(tags=["orders"]),
    cancel=extend_schema(tags=["orders"], request=None, responses=OrderSerializer),
    pay=extend_schema(tags=["orders"], request=None, responses=OrderSerializer),
    update_delivery_address=extend_schema(
        tags=["orders"],
        request=inline_serializer(
            name="OrderUpdateDeliveryAddressRequest",
            fields={"delivery_address": serializers.CharField()},
        ),
        responses=OrderSerializer,
    ),
)
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
        cart_items = list(
            cart.items.filter(selected=True)
            .select_related('product')
            .order_by('product_id', 'id')
        )
        
        if not cart_items:
            raise serializers.ValidationError("Нет выбранных товаров для заказа")

        product_ids = sorted({cart_item.product_id for cart_item in cart_items})
        locked_products = {
            product.id: product
            for product in Product.objects.select_for_update()
            .filter(id__in=product_ids)
            .order_by('id')
        }

        total_amount = Decimal('0')
        for cart_item in cart_items:
            product = locked_products[cart_item.product_id]

            if product.stock_quantity == 0:
                raise serializers.ValidationError(f"Товар закончился: {product.name}")

            if product.stock_quantity < cart_item.quantity:
                raise serializers.ValidationError(f"Недостаточно товара: {product.name}")

            total_amount += product.price * cart_item.quantity

        # Create order with precomputed total.
        payment_method = serializer.validated_data.get('payment_method', 'card')
        initial_status = 'confirmed' if payment_method == 'cash' else 'created'
        order = serializer.save(buyer=user, status=initial_status, total_amount=total_amount)

        # Decrease stock and create order line items.
        for cart_item in cart_items:
            product = locked_products[cart_item.product_id]
            product.stock_quantity -= cart_item.quantity
            product.save(update_fields=['stock_quantity'])
            
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=cart_item.quantity,
                price=product.price
            )

        # Remove only selected items from the cart.
        cart.items.filter(id__in=[cart_item.id for cart_item in cart_items]).delete()

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def cancel(self, request, pk=None):
        queryset = self.filter_queryset(self.get_queryset()).select_for_update()
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        order = get_object_or_404(
            queryset,
            **{self.lookup_field: self.kwargs[lookup_url_kwarg]},
        )
        self.check_object_permissions(request, order)

        if order.status != 'created':
            return Response(
                {'detail': 'Отменить можно только заказ со статусом created.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        items = list(order.items.order_by('product_id', 'id'))
        quantities_by_product = {}
        for item in items:
            quantities_by_product[item.product_id] = (
                quantities_by_product.get(item.product_id, 0) + item.quantity
            )

        locked_products = {
            product.id: product
            for product in Product.objects.select_for_update()
            .filter(id__in=quantities_by_product.keys())
            .order_by('id')
        }

        for product_id, quantity in quantities_by_product.items():
            product = locked_products[product_id]
            product.stock_quantity += quantity
            product.save(update_fields=['stock_quantity'])

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