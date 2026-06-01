from django.db.models import Count
from django.db.models import Prefetch
from django.utils import timezone
from urllib.parse import quote

from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .audit_export import DEFAULT_EXPORT_DAYS, build_audit_export

from api.ai_chat.models import AIChatHistory
from api.categories.models import Category
from api.orders.models import Order, OrderItem
from api.products.models import Product
from api.reports.models import Report
from api.reports.serializers import ReportSerializer
from api.stores.models import Store
from api.users.models import CustomUser

from .models import AdminActionLog
from .permissions import IsModerator
from .serializers import (
    AdminActionLogSerializer,
    AIChatHistoryAdminSerializer,
    OrderAdminSerializer,
    CategoryModerationSerializer,
    ProductModerationSerializer,
    StoreModerationSerializer,
    UserAdminSerializer,
)


def _get_client_ip(request):
    # Prefer X-Forwarded-For when behind a proxy/LB.
    xff = (request.META.get("HTTP_X_FORWARDED_FOR") or "").strip()
    if xff:
        # XFF can be a comma-separated chain. The left-most is the original client.
        return xff.split(",")[0].strip() or None
    return (request.META.get("REMOTE_ADDR") or "").strip() or None


def _log(request, action: str, object_type: str, object_id: str, payload=None, actor=None):
    actor = actor if actor is not None else getattr(request, "user", None)
    AdminActionLog.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        action=action,
        object_type=object_type,
        object_id=str(object_id),
        payload=payload or {},
        ip_address=_get_client_ip(request),
        user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:2000],
        request_method=(request.method or "")[:10],
        request_path=(request.path or "")[:255],
    )


class ProductModerationViewSet(viewsets.ModelViewSet):
    serializer_class = ProductModerationSerializer
    permission_classes = [IsModerator]
    http_method_names = ["get", "patch", "head", "options", "post"]

    def get_queryset(self):
        qs = (
            Product.objects.select_related("store", "store__owner", "category")
            .all()
            .order_by("-created_at")
        )
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(name__icontains=q)
        store_id = self.request.query_params.get("store")
        if store_id:
            qs = qs.filter(store_id=store_id)
        return qs

    @action(detail=True, methods=["post"], url_path="set_status")
    def set_status(self, request, pk=None):
        product = self.get_object()
        new_status = (request.data or {}).get("status")
        reason = (request.data or {}).get("reason", None)
        if reason is None:
            reason = (request.data or {}).get("moderation_reason", "") or ""
        allowed = {c[0] for c in Product.STATUS_CHOICES}
        if new_status not in allowed:
            return Response({"detail": "Некорректный status."}, status=status.HTTP_400_BAD_REQUEST)
        before = product.status
        product.status = new_status
        product.moderated_by = request.user
        product.moderated_at = timezone.now()
        product.moderation_reason = reason
        product.save(update_fields=["status", "moderated_by", "moderated_at", "moderation_reason", "updated_at"])
        _log(
            request,
            "product.set_status",
            "product",
            product.id,
            {"from": before, "to": new_status, "reason": reason},
        )
        return Response(self.get_serializer(product).data)


class CategoryModerationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategoryModerationSerializer
    permission_classes = [IsModerator]
    http_method_names = ["get", "head", "options", "post"]

    def get_queryset(self):
        qs = (
            Category.objects.select_related("created_by")
            .annotate(products_count=Count("products"))
            .order_by("-id")
        )
        verified = (self.request.query_params.get("verified") or "false").strip().lower()
        if verified in {"false", "0", "no"}:
            qs = qs.filter(is_verified=False)
        elif verified in {"true", "1", "yes"}:
            qs = qs.filter(is_verified=True)
        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(name__icontains=q)
        return qs

    @action(detail=True, methods=["post"], url_path="verify")
    def verify(self, request, pk=None):
        category = self.get_object()
        if category.is_verified:
            return Response(
                {"detail": "Категория уже проверена."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        category.is_verified = True
        category.save(update_fields=["is_verified"])
        _log(
            request,
            "category.verify",
            "category",
            category.id,
            {"name": category.name},
        )
        return Response(self.get_serializer(category).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        category = self.get_object()
        if category.is_verified:
            return Response(
                {"detail": "Нельзя отклонить проверенную категорию."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = (request.data or {}).get("reason", "") or ""
        payload = {"name": category.name, "reason": reason}
        category_id = category.id
        category.delete()
        _log(request, "category.reject", "category", category_id, payload)
        return Response(status=status.HTTP_204_NO_CONTENT)


class StoreModerationViewSet(viewsets.ModelViewSet):
    serializer_class = StoreModerationSerializer
    permission_classes = [IsModerator]
    http_method_names = ["get", "patch", "head", "options", "post"]

    def get_queryset(self):
        qs = Store.objects.select_related("owner").all().order_by("-created_at")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(name__icontains=q)
        owner_id = self.request.query_params.get("owner")
        if owner_id:
            qs = qs.filter(owner_id=owner_id)
        return qs

    @action(detail=True, methods=["post"], url_path="set_status")
    def set_status(self, request, pk=None):
        store = self.get_object()
        new_status = (request.data or {}).get("status")
        reason = (request.data or {}).get("reason", None)
        if reason is None:
            reason = (request.data or {}).get("moderation_reason", "") or ""
        allowed = {c[0] for c in Store.STATUS_CHOICES}
        if new_status not in allowed:
            return Response({"detail": "Некорректный status."}, status=status.HTTP_400_BAD_REQUEST)
        before = store.status
        store.status = new_status
        store.moderated_by = request.user
        store.moderated_at = timezone.now()
        store.moderation_reason = reason
        store.save(update_fields=["status", "moderated_by", "moderated_at", "moderation_reason", "updated_at"])
        _log(
            request,
            "store.set_status",
            "store",
            store.id,
            {"from": before, "to": new_status, "reason": reason},
        )
        return Response(self.get_serializer(store).data)


class ReportModerationViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [IsModerator]
    http_method_names = ["get", "patch", "head", "options", "post"]

    def get_queryset(self):
        qs = Report.objects.select_related(
            "reporter", "review", "product", "store", "handled_by"
        ).order_by("-created_at")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        report = self.get_object()
        note = (request.data or {}).get("note", "") or ""
        before = report.status
        report.status = Report.STATUS_RESOLVED
        report.resolution_note = note
        report.handled_by = request.user
        report.handled_at = timezone.now()
        report.save(update_fields=["status", "resolution_note", "handled_by", "handled_at", "updated_at"])
        _log(request, "report.resolve", "report", report.id, {"from": before, "note": note})
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        report = self.get_object()
        note = (request.data or {}).get("note", "") or ""
        before = report.status
        report.status = Report.STATUS_REJECTED
        report.resolution_note = note
        report.handled_by = request.user
        report.handled_at = timezone.now()
        report.save(update_fields=["status", "resolution_note", "handled_by", "handled_at", "updated_at"])
        _log(request, "report.reject", "report", report.id, {"from": before, "note": note})
        return Response(self.get_serializer(report).data)


class UsersAdminViewSet(viewsets.ModelViewSet):
    serializer_class = UserAdminSerializer
    permission_classes = [IsModerator]
    http_method_names = ["get", "patch", "head", "options"]
    queryset = CustomUser.objects.all().order_by("-date_joined")


class AIChatHistoryAdminViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AIChatHistoryAdminSerializer
    permission_classes = [IsModerator]

    def get_queryset(self):
        qs = AIChatHistory.objects.select_related("user").all().order_by("-created_at")
        user_id = self.request.query_params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)
        response_type = self.request.query_params.get("response_type")
        if response_type:
            qs = qs.filter(response_type=response_type)
        return qs


class OrdersModerationViewSet(viewsets.ModelViewSet):
    serializer_class = OrderAdminSerializer
    permission_classes = [IsModerator]
    http_method_names = ["get", "patch", "head", "options", "post"]

    def get_queryset(self):
        qs = (
            Order.objects.select_related("buyer")
            .prefetch_related(
                Prefetch(
                    "items",
                    queryset=OrderItem.objects.select_related("product", "product__store", "product__store__owner"),
                )
            )
            .all()
            .order_by("-created_at")
        )
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        buyer_id = self.request.query_params.get("buyer")
        if buyer_id:
            qs = qs.filter(buyer_id=buyer_id)
        store_id = self.request.query_params.get("store")
        if store_id:
            qs = qs.filter(items__product__store_id=store_id).distinct()
        seller_id = self.request.query_params.get("seller")
        if seller_id:
            qs = qs.filter(items__product__store__owner_id=seller_id).distinct()
        return qs

    @action(detail=True, methods=["post"], url_path="set_status")
    def set_status(self, request, pk=None):
        order = self.get_object()
        new_status = (request.data or {}).get("status")
        allowed = {c[0] for c in Order.STATUS_CHOICES}
        if new_status not in allowed:
            return Response({"detail": "Некорректный status."}, status=status.HTTP_400_BAD_REQUEST)
        before = order.status
        order.status = new_status
        try:
            order.save(update_fields=["status", "updated_at"])
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        _log(request, "order.set_status", "order", order.id, {"from": before, "to": new_status})
        return Response(self.get_serializer(order).data)


class AdminActionLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AdminActionLogSerializer
    permission_classes = [IsModerator]
    queryset = AdminActionLog.objects.select_related("actor").all().order_by("-created_at")

    @action(detail=False, methods=["post"], url_path="export")
    def export_logs(self, request):
        raw_days = (request.data or {}).get("days", request.query_params.get("days"))
        try:
            days = int(raw_days) if raw_days is not None else DEFAULT_EXPORT_DAYS
        except (TypeError, ValueError):
            return Response(
                {"detail": "Параметр days должен быть целым числом."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            content, filename, meta = build_audit_export(days=days)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        _log(
            request,
            "audit.export",
            "audit_export",
            meta["filename"],
            {
                "days": days,
                "count": meta["count"],
                "filename": meta["filename"],
                "truncated": meta["truncated"],
            },
        )
        response = HttpResponse(content, content_type="text/plain; charset=utf-8")
        response["Content-Disposition"] = (
            f"attachment; filename=\"audit_export.txt\"; "
            f"filename*=UTF-8''{quote(filename)}"
        )
        response["X-Export-Count"] = str(meta["count"])
        response["X-Export-Truncated"] = "1" if meta["truncated"] else "0"
        return response

