from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from .models import Product, WishlistItem
from .serializers import ProductSerializer, WishlistItemSerializer
from rest_framework.response import Response
from rest_framework import status, permissions

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("-created_at")
    serializer_class = ProductSerializer
    
    # Разрешения:
    # - Список и просмотр — всем
    # - Создание/изменение/удаление — только авторизованным
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = Product.objects.all().order_by("-created_at")
        
        # Фильтрация по магазину (для страницы магазина)
        store_id = self.request.query_params.get('store')
        if store_id:
            queryset = queryset.filter(store_id=store_id)
        
        # Фильтрация по категории
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(brand__icontains=search) |
                Q(category__name__icontains=search) |
                Q(store__name__icontains=search)
            )

        ordering = self.request.query_params.get('ordering')
        allowed_ordering = {'price', '-price', 'created_at', '-created_at'}
        if ordering in allowed_ordering:
            queryset = queryset.order_by(ordering)

        return queryset

    def perform_create(self, serializer):
        # Автоматически проверяем что пользователь — владелец магазина
        store = serializer.validated_data.get('store')
        if store and store.owner != self.request.user:
            raise PermissionDenied("Вы не можете добавлять товары в чужой магазин.")
        serializer.save()

    def perform_update(self, serializer):
        # Проверяем что пользователь редактирует только свои товары
        product = self.get_object()
        if product.store.owner != self.request.user:
            raise PermissionDenied("Вы не можете редактировать чужие товары.")
        serializer.save()

    def perform_destroy(self, serializer):
        # Проверяем что пользователь удаляет только свои товары
        product = self.get_object()
        if product.store.owner != self.request.user:
            raise PermissionDenied("Вы не можете удалять чужие товары.")
        product.delete()


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WishlistItem.objects.filter(user=self.request.user).select_related('product')

    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product')
        if not product_id:
            return Response({'error': 'Product ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        obj, created = WishlistItem.objects.get_or_create(user=request.user, product_id=product_id)
        serializer = self.get_serializer(obj)
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=status_code)