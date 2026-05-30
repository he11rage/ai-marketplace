from django.db.models import Sum
from rest_framework import serializers

from api.orders.models import Order, OrderItem
from .models import Store

class StoreSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username') 
    owner_id = serializers.ReadOnlyField(source='owner.id')
    slug = serializers.SlugField(read_only=True)
    products_count = serializers.SerializerMethodField()
    total_sales = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    rating_auto = serializers.DecimalField(source="rating", max_digits=2, decimal_places=1, read_only=True)
    
    class Meta:
        model = Store
        fields = [
            'id', 'owner', 'owner_id', 'name', 'slug', 'description',
            'logo', 'is_verified', 'rating', 'rating_auto', 'rating_manual',
            'review_count', 'status', 'created_at', 'updated_at', 'products_count',
            'total_sales',
        ]
        read_only_fields = ['owner', 'rating', 'rating_auto', 'review_count', 'status', 'created_at', 'updated_at', 'slug']

    def _is_admin(self, request):
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False) and (getattr(user, "is_admin", False) or getattr(user, "is_staff", False)))

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if not self._is_admin(request):
            # Expose values to public, but don't allow non-admin edits.
            fields["is_verified"].read_only = True
            fields["rating_manual"].read_only = True
        return fields

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.method in ("PUT", "PATCH"):
            if not self._is_admin(request):
                forbidden = {"is_verified", "rating_manual"} & set(self.initial_data.keys())
                if forbidden:
                    raise serializers.ValidationError({k: "Изменять это поле может только администратор." for k in sorted(forbidden)})
        return super().validate(attrs)
    
    def get_products_count(self, obj):
        return obj.products.count()

    def get_total_sales(self, obj):
        annotated = getattr(obj, "total_sales", None)
        if annotated is not None:
            return int(annotated)
        total = (
            OrderItem.objects.filter(
                product__store_id=obj.id,
                order__status__in=Order.SALES_COUNT_STATUSES,
            ).aggregate(total=Sum("quantity"))["total"]
        )
        return int(total or 0)

    def get_rating(self, obj):
        return obj.rating_effective