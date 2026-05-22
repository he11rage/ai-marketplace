from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import Store
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
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    def get_queryset(self):
        return Store.objects.all()

    @action(detail=False, methods=['get'])
    def my_stores(self, request):
        if request.user.is_authenticated:
            my_stores = Store.objects.filter(owner=request.user)
            serializer = self.get_serializer(my_stores, many=True)
            return Response(serializer.data)
        return Response([])