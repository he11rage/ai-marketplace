from decimal import Decimal, InvalidOperation

from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from django.db.models import Q, Sum, OuterRef, Subquery, IntegerField, Value
from django.db.models.functions import Coalesce
from .models import Product, WishlistItem
from .pagination import OptionalPageNumberPagination
from .serializers import ProductSerializer, WishlistItemSerializer
from rest_framework.response import Response
from rest_framework import status, permissions
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema, extend_schema_view, inline_serializer


def _parse_csv_ints(raw):
    if not raw:
        return []
    try:
        return [int(item.strip()) for item in raw.split(',') if item.strip()]
    except ValueError:
        return []


def _parse_csv_strings(raw):
    if not raw:
        return []
    return [item.strip() for item in raw.split(',') if item.strip()]


def _parse_decimal(raw):
    if raw in (None, ''):
        return None
    try:
        return Decimal(str(raw).strip().replace(',', '.'))
    except (InvalidOperation, ValueError):
        return None


def _is_truthy(raw):
    return str(raw).strip().lower() in {'1', 'true', 'yes', 'on'}

@extend_schema_view(
    list=extend_schema(
        tags=["products"],
        parameters=[
            OpenApiParameter("store", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Filter products by store id."),
            OpenApiParameter("store_ids", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Comma-separated store ids, for example: 1,2."),
            OpenApiParameter("stores", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Alias for store_ids."),
            OpenApiParameter("category", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Filter products by category id."),
            OpenApiParameter("categories", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Comma-separated category ids, for example: 1,2,3."),
            OpenApiParameter("price_min", OpenApiTypes.NUMBER, OpenApiParameter.QUERY, description="Minimum product price."),
            OpenApiParameter("price_max", OpenApiTypes.NUMBER, OpenApiParameter.QUERY, description="Maximum product price."),
            OpenApiParameter("min_rating", OpenApiTypes.NUMBER, OpenApiParameter.QUERY, description="Minimum product rating."),
            OpenApiParameter("in_stock", OpenApiTypes.BOOL, OpenApiParameter.QUERY, description="Only products with stock_quantity > 0."),
            OpenApiParameter("brand", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Filter by brand (single value or comma-separated list)."),
            OpenApiParameter("brands", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Comma-separated brand names."),
            OpenApiParameter("search", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Search by product, brand, category, or store name."),
            OpenApiParameter(
                "ordering",
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                enum=["price", "-price", "created_at", "-created_at", "rating", "-rating", "popular", "relevance"],
            ),
            OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Page number (enables paginated response)."),
            OpenApiParameter("page_size", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Items per page (max 48, default 12)."),
        ],
    ),
    retrieve=extend_schema(tags=["products"]),
    create=extend_schema(tags=["products"]),
    update=extend_schema(tags=["products"]),
    partial_update=extend_schema(tags=["products"]),
    destroy=extend_schema(tags=["products"]),
)
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("-created_at")
    serializer_class = ProductSerializer
    pagination_class = OptionalPageNumberPagination
    
    # Public read access, authenticated write access.
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'brands']:
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
        
        # Filter by category (single or multiple).
        category_ids = _parse_csv_ints(self.request.query_params.get('categories'))
        if not category_ids:
            category_id = self.request.query_params.get('category')
            if category_id:
                try:
                    category_ids = [int(category_id)]
                except ValueError:
                    category_ids = []
        if category_ids:
            queryset = queryset.filter(category_id__in=category_ids)

        price_min = _parse_decimal(self.request.query_params.get('price_min'))
        if price_min is not None:
            queryset = queryset.filter(price__gte=price_min)

        price_max = _parse_decimal(self.request.query_params.get('price_max'))
        if price_max is not None:
            queryset = queryset.filter(price__lte=price_max)

        min_rating = _parse_decimal(self.request.query_params.get('min_rating'))
        if min_rating is not None:
            queryset = queryset.filter(rating__gte=min_rating)

        if _is_truthy(self.request.query_params.get('in_stock')):
            queryset = queryset.filter(stock_quantity__gt=0)

        brands = _parse_csv_strings(
            self.request.query_params.get('brands') or self.request.query_params.get('brand')
        )
        if brands:
            brand_query = Q()
            for brand_name in brands:
                brand_query |= Q(brand__iexact=brand_name)
            queryset = queryset.filter(brand_query)

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
        allowed_ordering = {
            'price', '-price', 'created_at', '-created_at', 'rating', '-rating', 'popular', 'relevance',
        }
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

    @extend_schema(tags=["products"], responses={200: {"type": "array", "items": {"type": "string"}}})
    @action(detail=False, methods=['get'], url_path='brands')
    def brands(self, request):
        brand_names = (
            Product.objects
            .exclude(brand__isnull=True)
            .exclude(brand='')
            .values_list('brand', flat=True)
            .distinct()
            .order_by('brand')
        )
        return Response(list(brand_names))

    def perform_create(self, serializer):
        # Enforce owner-only product creation per store.
        store = serializer.validated_data.get('store')
        if store and store.owner != self.request.user:
            raise PermissionDenied("Вы не можете добавлять товары в чужой магазин.")
        # New products start with zero rating and reviews.
        serializer.save(
            rating=0,
            review_count=0,
            status=Product.STATUS_PENDING_MODERATION,
        )

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


@extend_schema_view(
    list=extend_schema(tags=["wishlist"]),
    retrieve=extend_schema(tags=["wishlist"]),
    create=extend_schema(
        tags=["wishlist"],
        request=inline_serializer(
            name="WishlistCreateRequest",
            fields={"product": serializers.IntegerField(help_text="Product id to add to wishlist.")},
        ),
        responses={200: WishlistItemSerializer, 201: WishlistItemSerializer},
    ),
    update=extend_schema(tags=["wishlist"]),
    partial_update=extend_schema(tags=["wishlist"]),
    destroy=extend_schema(tags=["wishlist"]),
)
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