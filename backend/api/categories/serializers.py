from rest_framework import serializers
from django.utils.text import slugify
from .models import Category

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        
    def create(self, validated_data):
        if 'slug' not in validated_data and 'name' in validated_data:
            validated_data['slug'] = slugify(validated_data['name'])
        return super().create(validated_data)