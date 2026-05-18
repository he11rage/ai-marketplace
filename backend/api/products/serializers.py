from rest_framework import serializers
from .models import Product, WishlistItem
from api.stores.models import Store  # 👈 Импортируем Store
from api.categories.models import Category  # 👈 Импортируем Category (если есть)


class ProductSerializer(serializers.ModelSerializer):
    # 👇 Простые поля для ID (запись)
    store = serializers.PrimaryKeyRelatedField(queryset=Store.objects.all())
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), 
        required=False, 
        allow_null=True
    )
    
    # 👇 Поля для чтения (отдаём имя категории/магазина)
    store_name = serializers.CharField(source='store.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'old_price',
            'brand', 'stock_quantity', 'rating', 'review_count',
            'image', 'store', 'store_name', 'category', 'category_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'rating', 'review_count', 'created_at', 'updated_at']


class WishlistItemSerializer(serializers.ModelSerializer):
    # 👇 Простая информация о продукте для списка избранного
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    
    class Meta:
        model = WishlistItem
        fields = ['id', 'product_id', 'product_name', 'product_price', 'product_image', 'added_at']