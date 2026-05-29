from decimal import Decimal, InvalidOperation

from django.db.models import Prefetch, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response

from api.orders.models import Order, OrderItem
from api.products.moderation import seller_update_moderation_fields
from api.products.models import Product, ProductChangeLog
from api.products.serializers import ProductSerializer
from api.stores.models import Store
from api.users.roles import is_platform_admin

from .permissions import IsSeller
from .serializers import SellerOrderSerializer, SellerProductSerializer


def _is_truthy(raw):
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


def _parse_decimal(raw):
    if raw in (None, ""):
        return None
    try:
        return Decimal(str(raw).strip().replace(",", "."))
    except (InvalidOperation, ValueError):
        return None


SELLER_ORDER_STATUS_TRANSITIONS = {
    Order.STATUS_PAID: {Order.STATUS_PROCESSING},
    Order.STATUS_PROCESSING: {Order.STATUS_SHIPPED},
    Order.STATUS_SHIPPED: {Order.STATUS_DELIVERED},
}


class SellerProductViewSet(viewsets.ModelViewSet):
    serializer_class = SellerProductSerializer
    permission_classes = [IsSeller]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = (
            Product.objects.select_related("store", "category")
            .filter(store__owner=self.request.user)
            .order_by("-created_at")
        )
        status_filter = (self.request.query_params.get("status") or "").strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        store_id = self.request.query_params.get("store")
        if store_id:
            qs = qs.filter(store_id=store_id)
        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(brand__icontains=q))
        return qs

    def _ensure_owner(self, product):
        if product.store.owner_id != self.request.user.id and not is_platform_admin(self.request.user):
            raise PermissionDenied("Вы не можете управлять чужими товарами.")

    def perform_create(self, serializer):
        store = serializer.validated_data.get("store")
        if store.owner_id != self.request.user.id and not is_platform_admin(self.request.user):
            raise PermissionDenied("Вы не можете добавлять товары в чужой магазин.")

        save_as_draft = _is_truthy(self.request.data.get("save_as_draft"))
        initial_status = Product.STATUS_DRAFT if save_as_draft else Product.STATUS_PENDING_MODERATION
        product = serializer.save(rating=0, review_count=0, status=initial_status)
        ProductChangeLog.objects.create(
            product=product,
            changed_by=self.request.user,
            action=ProductChangeLog.ACTION_CREATE,
            changes={"snapshot": ProductSerializer(product, context={"request": self.request}).data},
        )

    def perform_update(self, serializer):
        product = self.get_object()
        self._ensure_owner(product)
        if product.status not in {
            Product.STATUS_DRAFT,
            Product.STATUS_PENDING_MODERATION,
            Product.STATUS_REJECTED,
            Product.STATUS_ACTIVE,
            Product.STATUS_ARCHIVED,
        }:
            raise ValidationError("Редактирование недоступно для текущего статуса товара.")
        before_status = product.status
        moderation_fields = seller_update_moderation_fields(
            product,
            by_admin=is_platform_admin(self.request.user),
        )
        updated = serializer.save(**moderation_fields)
        if before_status != updated.status:
            ProductChangeLog.objects.create(
                product=updated,
                changed_by=self.request.user,
                action=ProductChangeLog.ACTION_UPDATE,
                changes={"status": {"from": before_status, "to": updated.status}},
            )

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        product = self.get_object()
        self._ensure_owner(product)
        if product.status != Product.STATUS_DRAFT:
            return Response(
                {"detail": "На модерацию можно отправить только черновик."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        before = product.status
        product.status = Product.STATUS_PENDING_MODERATION
        product.save(update_fields=["status", "updated_at"])
        ProductChangeLog.objects.create(
            product=product,
            changed_by=request.user,
            action=ProductChangeLog.ACTION_UPDATE,
            changes={"status": {"from": before, "to": product.status}},
        )
        return Response(self.get_serializer(product).data)

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        return self._set_product_status(request, pk, Product.STATUS_ARCHIVED)

    @action(detail=True, methods=["post"], url_path="hide")
    def hide(self, request, pk=None):
        return self._set_product_status(request, pk, Product.STATUS_ARCHIVED)

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        product = self.get_object()
        self._ensure_owner(product)
        if product.status != Product.STATUS_ARCHIVED:
            return Response(
                {"detail": "Вернуть можно только архивный товар."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        before = product.status
        if product.store.status == Store.STATUS_ACTIVE:
            product.status = Product.STATUS_ACTIVE
        else:
            product.status = Product.STATUS_PENDING_MODERATION
        product.save(update_fields=["status", "updated_at"])
        ProductChangeLog.objects.create(
            product=product,
            changed_by=request.user,
            action=ProductChangeLog.ACTION_UPDATE,
            changes={"status": {"from": before, "to": product.status}},
        )
        return Response(self.get_serializer(product).data)

    def _set_product_status(self, request, pk, target_status):
        product = self.get_object()
        self._ensure_owner(product)
        allowed_sources = {
            Product.STATUS_ACTIVE,
            Product.STATUS_DRAFT,
            Product.STATUS_REJECTED,
            Product.STATUS_PENDING_MODERATION,
        }
        if product.status not in allowed_sources:
            return Response(
                {"detail": f"Нельзя изменить статус из состояния «{product.status}»."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        before = product.status
        product.status = target_status
        product.save(update_fields=["status", "updated_at"])
        ProductChangeLog.objects.create(
            product=product,
            changed_by=request.user,
            action=ProductChangeLog.ACTION_UPDATE,
            changes={"status": {"from": before, "to": target_status}},
        )
        return Response(self.get_serializer(product).data)


class SellerOrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SellerOrderSerializer
    permission_classes = [IsSeller]

    def get_queryset(self):
        qs = (
            Order.objects.select_related("buyer")
            .filter(items__product__store__owner=self.request.user)
            .prefetch_related(
                Prefetch(
                    "items",
                    queryset=OrderItem.objects.select_related("product", "product__store"),
                )
            )
            .distinct()
            .order_by("-created_at")
        )
        status_filter = (self.request.query_params.get("status") or "").strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        store_id = self.request.query_params.get("store")
        if store_id:
            qs = qs.filter(items__product__store_id=store_id).distinct()
        return qs

    def _order_has_seller_items(self, order):
        return order.items.filter(product__store__owner=self.request.user).exists()

    @action(detail=True, methods=["post"], url_path="set_status")
    def set_status(self, request, pk=None):
        order = self.get_object()
        if not self._order_has_seller_items(order):
            raise NotFound()

        new_status = (request.data or {}).get("status")
        allowed_targets = {Order.STATUS_PROCESSING, Order.STATUS_SHIPPED, Order.STATUS_DELIVERED}
        if new_status not in allowed_targets:
            return Response(
                {"detail": "Продавец может переводить заказ только в processing, shipped или delivered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_from = SELLER_ORDER_STATUS_TRANSITIONS.get(order.status, set())
        if new_status not in allowed_from:
            return Response(
                {"detail": Order.status_transition_error(order.status, new_status)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        before = order.status
        order.status = new_status
        try:
            order.save(update_fields=["status", "updated_at"])
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                **self.get_serializer(order).data,
                "status_change": {"from": before, "to": new_status},
            }
        )
