from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from api.stores.models import Store
from rest_framework.exceptions import PermissionDenied
from .models import Product
from .serializers import ProductSerializer
from .permissions import IsStoreOwner


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("-created_at")
    serializer_class = ProductSerializer

    # permission_classes = [IsStoreOwner]

    # def perform_create(self, serializer):
    #     store = serializer.validated_data.get("store")

    #     if store.owner != self.request.user:
    #         raise PermissionDenied("Вы не можете добавлять товары в чужой магазин.")

    #     serializer.save()
