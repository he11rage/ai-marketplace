from decimal import Decimal, InvalidOperation

from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from django.db.models import Q, Sum, OuterRef, Subquery, IntegerField, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from .models import Product, WishlistItem, ProductQuestion, ProductChangeLog
from .pagination import OptionalPageNumberPagination
from .serializers import (
    ProductSerializer,
    WishlistItemSerializer,
    ProductQuestionSerializer,
    ProductQuestionAnswerSerializer,
    ProductChangeLogSerializer,
)
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
        if self.action in ['list', 'retrieve', 'brands', 'questions', 'create_question']:
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
        product = serializer.save(
            rating=0,
            review_count=0,
            status=Product.STATUS_PENDING_MODERATION,
        )
        ProductChangeLog.objects.create(
            product=product,
            changed_by=self.request.user,
            action=ProductChangeLog.ACTION_CREATE,
            changes={"snapshot": ProductSerializer(product, context={"request": self.request}).data},
        )

    def perform_update(self, serializer):
        # Only store owners can update products.
        product = self.get_object()
        if product.store.owner != self.request.user:
            raise PermissionDenied("Вы не можете редактировать чужие товары.")
        original = getattr(product, "_original_for_audit", None)
        updated = serializer.save()

        tracked_fields = [
            "name",
            "description",
            "price",
            "old_price",
            "brand",
            "image",
            "stock_quantity",
            "category_id",
            "status",
        ]
        changes = {}
        if original is not None:
            for f in tracked_fields:
                before = getattr(original, f, None)
                after = getattr(updated, f, None)
                if str(before) != str(after):
                    changes[f] = {"from": str(before) if before is not None else None, "to": str(after) if after is not None else None}
        else:
            changes["note"] = "original_snapshot_unavailable"

        if changes:
            ProductChangeLog.objects.create(
                product=updated,
                changed_by=self.request.user,
                action=ProductChangeLog.ACTION_UPDATE,
                changes=changes,
            )

    def perform_destroy(self, serializer):
        # Only store owners can delete products.
        product = self.get_object()
        if product.store.owner != self.request.user:
            raise PermissionDenied("Вы не можете удалять чужие товары.")
        ProductChangeLog.objects.create(
            product=product,
            changed_by=self.request.user,
            action=ProductChangeLog.ACTION_DELETE,
            changes={"snapshot": ProductSerializer(product, context={"request": self.request}).data},
        )
        product.delete()

    @extend_schema(
        tags=["product_questions"],
        responses={200: ProductQuestionSerializer(many=True)},
    )
    @action(detail=True, methods=["get"], permission_classes=[AllowAny], url_path="questions")
    def questions(self, request, pk=None):
        product = self.get_object()
        qs = ProductQuestion.objects.filter(product=product).exclude(status=ProductQuestion.STATUS_HIDDEN)
        return Response(ProductQuestionSerializer(qs, many=True, context={"request": request}).data)

    @extend_schema(
        tags=["product_questions"],
        request=ProductQuestionSerializer,
        responses={201: ProductQuestionSerializer},
    )
    @questions.mapping.post
    def create_question(self, request, pk=None):
        product = self.get_object()
        serializer = ProductQuestionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        obj = ProductQuestion.objects.create(
            product=product,
            user=request.user if request.user.is_authenticated else None,
            guest_name=serializer.validated_data.get("guest_name"),
            guest_email=serializer.validated_data.get("guest_email"),
            question=serializer.validated_data["question"],
            status=ProductQuestion.STATUS_OPEN,
        )
        return Response(ProductQuestionSerializer(obj, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=["product_questions"],
        request=ProductQuestionAnswerSerializer,
        responses={200: ProductQuestionSerializer},
    )
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated], url_path=r"questions/(?P<question_id>\d+)/answer")
    def answer_question(self, request, pk=None, question_id=None):
        product = self.get_object()
        if product.store.owner != request.user:
            raise PermissionDenied("Вы не можете отвечать на вопросы к чужим товарам.")

        try:
            q = ProductQuestion.objects.get(pk=question_id, product=product)
        except ProductQuestion.DoesNotExist:
            return Response({"detail": "Question not found."}, status=status.HTTP_404_NOT_FOUND)

        payload = ProductQuestionAnswerSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        q.answer = payload.validated_data["answer"]
        q.status = ProductQuestion.STATUS_ANSWERED
        q.answered_at = timezone.now()
        q.save(update_fields=["answer", "status", "answered_at"])
        return Response(ProductQuestionSerializer(q, context={"request": request}).data)

    @extend_schema(
        tags=["product_history"],
        responses={200: ProductChangeLogSerializer(many=True)},
    )
    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="history")
    def history(self, request, pk=None):
        product = self.get_object()
        if product.store.owner != request.user:
            raise PermissionDenied("История изменений доступна только владельцу товара.")
        logs = ProductChangeLog.objects.filter(product=product).order_by("-created_at")
        return Response(ProductChangeLogSerializer(logs, many=True, context={"request": request}).data)


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