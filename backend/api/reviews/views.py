from rest_framework import mixins, permissions, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Review
from .serializers import ReviewSerializer


class ReviewViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Review.objects.select_related("author", "product").order_by("-created_at")
        product_id = self.request.query_params.get("product")
        if product_id:
            qs = qs.filter(product_id=product_id)

        store_id = self.request.query_params.get("store")
        if store_id:
            qs = qs.filter(product__store_id=store_id)
        return qs

    def perform_destroy(self, instance):
        if instance.author_id != self.request.user.id:
            raise PermissionDenied("Вы можете удалять только свои отзывы.")
        instance.delete()

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny], url_path=r"store/(?P<store_id>\d+)/summary")
    def store_summary(self, request, store_id=None):
        """
        Summary for store reviews across ALL store products.
        Returns total count + latest reviews list (default limit=10).
        """
        try:
            limit = int(request.query_params.get("limit", 10))
        except (TypeError, ValueError):
            limit = 10
        limit = max(1, min(limit, 50))

        qs = Review.objects.select_related("author", "product").filter(product__store_id=store_id).order_by("-created_at")
        total = qs.count()
        latest = qs[:limit]
        data = ReviewSerializer(latest, many=True, context={"request": request}).data
        return Response({"store_id": int(store_id), "count": total, "latest": data})

