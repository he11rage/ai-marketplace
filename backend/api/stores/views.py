from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view
from api.orders.models import Order
from api.users.roles import is_platform_admin, is_seller
from .models import Store
from .permissions import IsStoreOwnerOrAdminOrReadOnly
from .serializers import StoreSerializer

@extend_schema_view(
    list=extend_schema(tags=["stores"]),
    retrieve=extend_schema(tags=["stores"]),
    create=extend_schema(tags=["stores"]),
    update=extend_schema(tags=["stores"]),
    partial_update=extend_schema(tags=["stores"]),
    destroy=extend_schema(tags=["stores"]),
    my_stores=extend_schema(
        tags=["stores"],
        responses=StoreSerializer(many=True),
        description="Return stores owned by the authenticated user. Anonymous users receive an empty list.",
    ),
)
class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [IsStoreOwnerOrAdminOrReadOnly]

    def perform_create(self, serializer):
        if not is_seller(self.request.user):
            raise PermissionDenied("Создавать магазины могут только продавцы.")
        serializer.save(owner=self.request.user)
    
    def get_queryset(self):
        sales_filter = Q(
            products__order_items__order__status__in=Order.SALES_COUNT_STATUSES
        )
        queryset = Store.objects.annotate(
            total_sales=Coalesce(
                Sum("products__order_items__quantity", filter=sales_filter),
                0,
            )
        )
        if self.action == "list":
            queryset = queryset.filter(status=Store.STATUS_ACTIVE)
        return queryset

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        is_publicly_visible = instance.status == Store.STATUS_ACTIVE
        if not is_publicly_visible:
            user = request.user
            can_view = (
                user.is_authenticated
                and (
                    is_platform_admin(user)
                    or instance.owner_id == user.id
                )
            )
            if not can_view:
                raise NotFound()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_stores(self, request):
        if request.user.is_authenticated:
            my_stores = Store.objects.filter(owner=request.user)
            serializer = self.get_serializer(my_stores, many=True)
            return Response(serializer.data)
        return Response([])