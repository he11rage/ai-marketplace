from rest_framework import viewsets
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import Category
from .serializers import CategorySerializer

@extend_schema_view(
    list=extend_schema(tags=["categories"]),
    retrieve=extend_schema(tags=["categories"]),
    create=extend_schema(tags=["categories"]),
    update=extend_schema(tags=["categories"]),
    partial_update=extend_schema(tags=["categories"]),
    destroy=extend_schema(tags=["categories"]),
)
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    # Permissions are intentionally open for now.