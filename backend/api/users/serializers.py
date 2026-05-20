from rest_framework import serializers
from djoser.serializers import UserCreateSerializer, UserSerializer
from django.contrib.auth import get_user_model
from django.db.models import Sum, F, DecimalField, ExpressionWrapper
from django.utils import timezone
from datetime import timedelta
from api.orders.models import OrderItem
from decimal import Decimal


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
        user = User.objects.create_user(**validated_data)
        return user
    
class CustomUserUpdateSerializer(UserSerializer):
    """Serializer for updating user profile"""
    confirmed_owner_items_count = serializers.SerializerMethodField()
    confirmed_owner_items_week_count = serializers.SerializerMethodField()
    confirmed_owner_items_previous_week_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'phone',
            'confirmed_owner_items_count',
            'confirmed_owner_items_week_count',
            'confirmed_owner_items_previous_week_count',
        )
        read_only_fields = ('id', 'username')

    def get_confirmed_owner_items_count(self, obj):
        return self._get_confirmed_owner_income(obj)

    def get_confirmed_owner_items_week_count(self, obj):
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        return self._get_confirmed_owner_income(obj, week_ago, now)

    def get_confirmed_owner_items_previous_week_count(self, obj):
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)
        return self._get_confirmed_owner_income(obj, two_weeks_ago, week_ago, end_inclusive=False)

    def _get_confirmed_owner_income(self, user, start_date=None, end_date=None, end_inclusive=True):
        revenue_expression = ExpressionWrapper(
            F('quantity') * F('price'),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )

        queryset = OrderItem.objects.filter(
            order__status='confirmed',
            product__store__owner=user,
        )

        if start_date is not None:
            queryset = queryset.filter(order__created_at__gte=start_date)

        if end_date is not None:
            date_filter = 'order__created_at__lte' if end_inclusive else 'order__created_at__lt'
            queryset = queryset.filter(**{date_filter: end_date})

        total_income = queryset.aggregate(total=Sum(revenue_expression)).get('total')
        return total_income or Decimal('0.00')