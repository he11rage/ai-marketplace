from rest_framework import serializers
from .models import Store

class StoreSerializer(serializers.ModelSerializer):
    
    owner = serializers.ReadOnlyField(source='owner.username') 
    
    class Meta:
        model = Store
        fields = ['id', 'owner', 'name', 'slug', 'description', 'logo', 'rating', 'created_at']