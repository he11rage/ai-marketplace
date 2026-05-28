from rest_framework import serializers
from .models import Product, WishlistItem, ProductQuestion, ProductChangeLog
from api.stores.models import Store
from api.categories.models import Category


class ProductSerializer(serializers.ModelSerializer):
    # Writable relation fields.
    store = serializers.PrimaryKeyRelatedField(queryset=Store.objects.all())
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), 
        required=False, 
        allow_null=True
    )
    
    # Read-only labels returned to the client.
    store_name = serializers.CharField(source='store.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'old_price',
            'brand', 'stock_quantity', 'rating', 'review_count', 'status',
            'image', 'store', 'store_name', 'category', 'category_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'rating', 'review_count', 'status', 'created_at', 'updated_at']


class WishlistItemSerializer(serializers.ModelSerializer):
    # Compact product snapshot for wishlist screens.
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    
    class Meta:
        model = WishlistItem
        fields = ['id', 'product_id', 'product_name', 'product_price', 'product_image', 'added_at']


class ProductQuestionSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = ProductQuestion
        fields = [
            "id",
            "product",
            "user",
            "guest_name",
            "guest_email",
            "question",
            "answer",
            "status",
            "created_at",
            "answered_at",
        ]
        read_only_fields = ["id", "product", "user", "answer", "status", "created_at", "answered_at"]

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            return attrs

        # Anonymous questions require at least a name or email.
        guest_name = attrs.get("guest_name")
        guest_email = attrs.get("guest_email")
        if not guest_name and not guest_email:
            raise serializers.ValidationError("Для вопроса укажите guest_name или guest_email.")
        return attrs


class ProductQuestionAnswerSerializer(serializers.Serializer):
    answer = serializers.CharField()


class ProductChangeLogSerializer(serializers.ModelSerializer):
    changed_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = ProductChangeLog
        fields = ["id", "product", "changed_by", "action", "changes", "created_at"]
        read_only_fields = fields