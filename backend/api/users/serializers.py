from rest_framework import serializers
from djoser.serializers import UserCreateSerializer
from django.contrib.auth import get_user_model


User = get_user_model()

class CustomUserCreateSerializer(UserCreateSerializer):
    """Extended user serializer"""
    
    class Meta(UserCreateSerializer.Meta):
        model = User
        
        fields = (
            'id',
            'username',
            'email',
            'password',
            'first_name',
            'last_name',
            'phone',
            'is_admin',
        )

        read_only_fields = ('id', 'is_admin')
        
    def create(self, validated_data):
        print("!!! МОЙ СЕРИАЛИЗАТОР РАБОТАЕТ !!!") # Добавьте это
        user = User.objects.create_user(**validated_data)
        return user