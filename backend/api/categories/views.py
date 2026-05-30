from django.db.models import Q
from rest_framework import viewsets
from drf_spectacular.utils import extend_schema, extend_schema_view
from api.users.roles import is_platform_admin, is_seller
from .models import Category
from .permissions import CategoryPermissions
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
    serializer_class = CategorySerializer
    permission_classes = [CategoryPermissions]

    def get_queryset(self):
        qs = Category.objects.all().order_by("name")
        user = self.request.user

        if is_platform_admin(user):
            return qs

        if is_seller(user):
            return qs.filter(Q(is_verified=True) | Q(created_by=user))

        return qs.filter(is_verified=True)

    def perform_create(self, serializer):
        user = self.request.user
        if is_platform_admin(user):
            serializer.save(is_verified=True, created_by=user)
        else:
            serializer.save(is_verified=False, created_by=user)
