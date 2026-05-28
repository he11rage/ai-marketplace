from django.utils import timezone
from django.db.models import Q
from rest_framework import mixins, permissions, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Review
from .serializers import ReviewSerializer


def _is_moderator(user) -> bool:
    return bool(
        user
        and getattr(user, "is_authenticated", False)
        and (getattr(user, "is_staff", False) or getattr(user, "is_admin", False))
    )


class ReviewViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve", "store_summary"}:
            return [permissions.AllowAny()]
        if self.action.startswith("moderation_"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Review.objects.select_related("author", "product").order_by("-created_at")
        product_id = self.request.query_params.get("product")
        if product_id:
            qs = qs.filter(product_id=product_id)

        store_id = self.request.query_params.get("store")
        if store_id:
            qs = qs.filter(product__store_id=store_id)

        # Visibility rules:
        # - public/regular users: only approved, plus own reviews (any status)
        # - moderators: all
        user = getattr(self.request, "user", None)
        if not _is_moderator(user):
            if user and user.is_authenticated:
                qs = qs.filter(
                    Q(status=Review.STATUS_APPROVED) | Q(author_id=user.id)
                )
            else:
                qs = qs.filter(status=Review.STATUS_APPROVED)
        return qs

    def perform_destroy(self, instance):
        if instance.author_id != self.request.user.id:
            raise PermissionDenied("Вы можете удалять только свои отзывы.")
        instance.delete()

    @action(
        detail=False,
        methods=["get"],
        url_path="moderation/queue",
    )
    def moderation_queue(self, request):
        if not _is_moderator(request.user):
            raise PermissionDenied("Недостаточно прав.")

        status_filter = request.query_params.get("status") or Review.STATUS_PENDING_MODERATION
        allowed = {Review.STATUS_PENDING_MODERATION, Review.STATUS_APPROVED, Review.STATUS_REJECTED}
        if status_filter not in allowed:
            status_filter = Review.STATUS_PENDING_MODERATION

        qs = Review.objects.select_related("author", "product").filter(status=status_filter).order_by("-created_at")
        data = ReviewSerializer(qs[:100], many=True, context={"request": request}).data
        return Response({"status": status_filter, "count": qs.count(), "results": data})

    @action(detail=True, methods=["post"], url_path="moderation/approve")
    def moderation_approve(self, request, pk=None):
        if not _is_moderator(request.user):
            raise PermissionDenied("Недостаточно прав.")
        review = self.get_object()
        note = (request.data or {}).get("note", "") or ""
        review.status = Review.STATUS_APPROVED
        review.moderated_by = request.user
        review.moderated_at = timezone.now()
        review.moderation_note = note
        review.save(update_fields=["status", "moderated_by", "moderated_at", "moderation_note", "updated_at"])
        return Response(ReviewSerializer(review, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="moderation/reject")
    def moderation_reject(self, request, pk=None):
        if not _is_moderator(request.user):
            raise PermissionDenied("Недостаточно прав.")
        review = self.get_object()
        note = (request.data or {}).get("note", "") or ""
        review.status = Review.STATUS_REJECTED
        review.moderated_by = request.user
        review.moderated_at = timezone.now()
        review.moderation_note = note
        review.save(update_fields=["status", "moderated_by", "moderated_at", "moderation_note", "updated_at"])
        return Response(ReviewSerializer(review, context={"request": request}).data)

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

        qs = (
            Review.objects.select_related("author", "product")
            .filter(product__store_id=store_id, status=Review.STATUS_APPROVED)
            .order_by("-created_at")
        )
        total = qs.count()
        latest = qs[:limit]
        data = ReviewSerializer(latest, many=True, context={"request": request}).data
        return Response({"store_id": int(store_id), "count": total, "latest": data})

