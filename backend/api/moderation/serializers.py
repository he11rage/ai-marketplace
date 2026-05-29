from rest_framework import serializers

from api.ai_chat.models import AIChatHistory
from api.orders.models import Order, OrderItem
from api.products.models import Product
from api.stores.models import Store
from api.users.models import CustomUser
from api.users.roles import UserRole
from .models import AdminActionLog


class AdminActionLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = AdminActionLog
        fields = [
            "id",
            "actor",
            "actor_username",
            "action",
            "object_type",
            "object_id",
            "payload",
            "ip_address",
            "user_agent",
            "request_method",
            "request_path",
            "created_at",
        ]
        read_only_fields = fields


class ProductModerationSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    store_id = serializers.IntegerField(source="store.id", read_only=True)
    owner_id = serializers.IntegerField(source="store.owner.id", read_only=True)
    owner_username = serializers.CharField(source="store.owner.username", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "old_price",
            "brand",
            "stock_quantity",
            "status",
            "moderated_by",
            "moderated_at",
            "moderation_reason",
            "image",
            "store_id",
            "store_name",
            "owner_id",
            "owner_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["moderated_by", "moderated_at", "moderation_reason"]


class StoreModerationSerializer(serializers.ModelSerializer):
    owner_id = serializers.IntegerField(source="owner.id", read_only=True)
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = Store
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "logo",
            "owner_id",
            "owner_username",
            "is_verified",
            "rating",
            "rating_manual",
            "review_count",
            "status",
            "moderated_by",
            "moderated_at",
            "moderation_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["moderated_by", "moderated_at", "moderation_reason"]


class UserAdminSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=UserRole.choices)

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "is_staff",
            "is_admin",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["is_admin"]

    def update(self, instance, validated_data):
        role = validated_data.get("role")
        if role == UserRole.ADMIN:
            validated_data["is_admin"] = True
        elif role is not None:
            validated_data["is_admin"] = False
        return super().update(instance, validated_data)


class AIChatHistoryAdminSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = AIChatHistory
        fields = [
            "id",
            "user",
            "username",
            "query",
            "response",
            "response_type",
            "prompt_tokens",
            "completion_tokens",
            "total_tokens",
            "created_at",
        ]
        read_only_fields = fields


class OrderItemAdminSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image = serializers.ImageField(source="product.image", read_only=True)
    store_id = serializers.IntegerField(source="product.store.id", read_only=True)
    store_name = serializers.CharField(source="product.store.name", read_only=True)
    seller_id = serializers.IntegerField(source="product.store.owner.id", read_only=True)
    seller_username = serializers.CharField(source="product.store.owner.username", read_only=True)

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
            "seller_id",
            "seller_username",
        ]
        read_only_fields = fields


class OrderAdminSerializer(serializers.ModelSerializer):
    buyer_username = serializers.CharField(source="buyer.username", read_only=True)
    items = OrderItemAdminSerializer(many=True, read_only=True)
    stores = serializers.SerializerMethodField()
    sellers = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "buyer",
            "buyer_username",
            "total_amount",
            "status",
            "payment_method",
            "delivery_address",
            "created_at",
            "updated_at",
            "items",
            "stores",
            "sellers",
        ]

    def get_stores(self, obj):
        # Distinct stores involved in the order.
        stores = {}
        for item in obj.items.all():
            store = getattr(item.product, "store", None)
            if store:
                stores[store.id] = store.name
        return [{"id": store_id, "name": name} for store_id, name in sorted(stores.items(), key=lambda x: x[0])]

    def get_sellers(self, obj):
        sellers = {}
        for item in obj.items.all():
            store = getattr(item.product, "store", None)
            owner = getattr(store, "owner", None) if store else None
            if owner:
                sellers[owner.id] = owner.username
        return [{"id": user_id, "username": username} for user_id, username in sorted(sellers.items(), key=lambda x: x[0])]

