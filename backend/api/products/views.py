from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q, Sum, OuterRef, Subquery, IntegerField, Value
from django.db.models.functions import Coalesce
from .models import Product, WishlistItem
from .serializers import ProductSerializer, WishlistItemSerializer
from rest_framework.response import Response
from rest_framework import status, permissions

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("-created_at")
    serializer_class = ProductSerializer
    
    # Public read access, authenticated write access.
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = Product.objects.all().order_by("-created_at")
        
        # Filter by single store (store page).
        store_id = self.request.query_params.get('store')
        if store_id:
            queryset = queryset.filter(store_id=store_id)

        # Filter by multiple stores (home/catalog).
        # Supports both store_ids=1,2 and stores=1,2 for compatibility.
        store_ids_raw = self.request.query_params.get('store_ids') or self.request.query_params.get('stores')
        if store_ids_raw:
            try:
                store_ids = [int(store_id.strip()) for store_id in store_ids_raw.split(',') if store_id.strip()]
            except ValueError:
                store_ids = []
            if store_ids:
                queryset = queryset.filter(store_id__in=store_ids)
        
        # Filter by category.
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
        allowed_ordering = {'price', '-price', 'created_at', '-created_at', 'popular', 'relevance'}
        if ordering == 'popular':
            store_popularity_subquery = (
                Product.objects
                .filter(store_id=OuterRef('store_id'))
                .values('store_id')
                .annotate(total_reviews=Coalesce(Sum('review_count'), Value(0)))
                .values('total_reviews')[:1]
            )
            queryset = queryset.annotate(
                store_popularity=Coalesce(
                    Subquery(store_popularity_subquery, output_field=IntegerField()),
                    Value(0)
                )
            ).order_by('-review_count', '-store_popularity', '-created_at')
        elif ordering == 'relevance':
            # Relevance ranking prioritizes reviewed products.
            queryset = queryset.order_by('-review_count', '-rating', '-created_at')
        elif ordering in allowed_ordering:
            queryset = queryset.order_by(ordering)

        return queryset

    def perform_create(self, serializer):
        # Enforce owner-only product creation per store.
        store = serializer.validated_data.get('store')
        if store and store.owner != self.request.user:
            raise PermissionDenied("Вы не можете добавлять товары в чужой магазин.")
        # New products start with zero rating and reviews.
        serializer.save(rating=0, review_count=0)

    def perform_update(self, serializer):
        # Only store owners can update products.
        product = self.get_object()
        if product.store.owner != self.request.user:
            raise PermissionDenied("Вы не можете редактировать чужие товары.")
        serializer.save()

    def perform_destroy(self, serializer):
        # Only store owners can delete products.
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