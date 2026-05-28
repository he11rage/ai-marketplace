from rest_framework import serializers

from api.orders.models import Order, OrderItem
from api.products.models import Product
from .models import Review


SUCCESSFUL_ORDER_STATUSES = {
    Order.STATUS_PAID,
    Order.STATUS_PROCESSING,
    Order.STATUS_SHIPPED,
    Order.STATUS_DELIVERED,
}


class ReviewSerializer(serializers.ModelSerializer):
    author = serializers.HiddenField(default=serializers.CurrentUserDefault())
    author_username = serializers.CharField(source="author.username", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    store_id = serializers.IntegerField(source="product.store_id", read_only=True)
    status = serializers.CharField(read_only=True)
    moderated_by = serializers.IntegerField(source="moderated_by_id", read_only=True)
    moderated_at = serializers.DateTimeField(read_only=True)
    moderation_note = serializers.CharField(read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "product",
            "product_name",
            "store_id",
            "author",
            "author_username",
            "rating",
            "text",
            "status",
            "moderated_by",
            "moderated_at",
            "moderation_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_rating(self, value):
        if not (1 <= int(value) <= 5):
            raise serializers.ValidationError("rating должен быть от 1 до 5.")
        return value

    def validate_product(self, value: Product):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Требуется авторизация.")

        has_successful_purchase = OrderItem.objects.filter(
            product=value,
            order__buyer=user,
            order__status__in=SUCCESSFUL_ORDER_STATUSES,
        ).exists()

        if not has_successful_purchase:
            raise serializers.ValidationError(
                "Оставить отзыв можно только после успешной покупки."
            )

        return value

    def create(self, validated_data):
        return super().create(validated_data)

