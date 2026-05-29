from decimal import Decimal

from rest_framework import serializers

from api.orders.models import Order, OrderItem
from api.products.models import Product
from api.products.serializers import ProductSerializer


class SellerProductSerializer(ProductSerializer):
    moderation_reason = serializers.CharField(read_only=True)

    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields + ["moderation_reason"]
        read_only_fields = ProductSerializer.Meta.read_only_fields


class SellerOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image = serializers.ImageField(source="product.image", read_only=True)
    store_id = serializers.IntegerField(source="product.store.id", read_only=True)
    store_name = serializers.CharField(source="product.store.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_image",
            "quantity",
            "price",
            "store_id",
            "store_name",
        ]
        read_only_fields = fields


class SellerOrderSerializer(serializers.ModelSerializer):
    buyer_username = serializers.CharField(source="buyer.username", read_only=True)
    items = serializers.SerializerMethodField()
    stores = serializers.SerializerMethodField()
    seller_subtotal = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "buyer",
            "buyer_username",
            "total_amount",
            "seller_subtotal",
            "status",
            "payment_method",
            "payment_method_display",
            "delivery_address",
            "created_at",
            "updated_at",
            "items",
            "stores",
        ]
        read_only_fields = fields

    def _seller_items(self, obj):
        owner_id = self.context["request"].user.id
        return [item for item in obj.items.all() if item.product.store.owner_id == owner_id]

    def get_items(self, obj):
        return SellerOrderItemSerializer(self._seller_items(obj), many=True).data

    def get_stores(self, obj):
        stores = {}
        for item in self._seller_items(obj):
            store = item.product.store
            stores[store.id] = store.name
        return [{"id": store_id, "name": name} for store_id, name in sorted(stores.items())]

    def get_seller_subtotal(self, obj):
        total = Decimal("0")
        for item in self._seller_items(obj):
            total += item.price * item.quantity
        return total
