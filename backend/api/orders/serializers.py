from rest_framework import serializers
from .models import Order, OrderItem
from datetime import timedelta

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['product', 'product_name', 'product_image', 'quantity', 'price']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    total = serializers.DecimalField(source='total_amount', max_digits=10, decimal_places=2, read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    estimated_delivery_date = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id',
            'buyer',
            'status',
            'payment_method',
            'payment_method_display',
            'delivery_address',
            'total_amount',
            'total',
            'items',
            'created_at',
            'updated_at',
            'estimated_delivery_date',
        ]
        read_only_fields = ['buyer', 'total_amount']

    def get_estimated_delivery_date(self, obj):
        if not obj.created_at:
            return None
        return (obj.created_at + timedelta(days=3)).isoformat()