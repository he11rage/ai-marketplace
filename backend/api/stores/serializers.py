from rest_framework import serializers
from .models import Store

class StoreSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username') 
    owner_id = serializers.ReadOnlyField(source='owner.id')
    slug = serializers.SlugField(read_only=True)
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Store
        fields = [
            'id', 'owner', 'owner_id', 'name', 'slug', 'description',
            'logo', 'rating', 'created_at', 'updated_at', 'products_count'
        ]
        read_only_fields = ['owner', 'rating', 'created_at', 'updated_at', 'slug']
    
    def get_products_count(self, obj):
        return obj.products.filter(store=obj).count()