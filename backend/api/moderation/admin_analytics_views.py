from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from django.shortcuts import get_object_or_404

# Импортируем модель магазина из вашего приложения stores
from api.stores.models import Store  

# Импортируем ваши готовые сервисные функции расчета аналитики из папки продавца
from api.seller.analytics import (
    _parse_threshold,
    build_low_stock,
    build_products_analytics,
    build_sales_overview,
    build_store_quality,
)

class AdminStoreAnalyticsOverviewView(APIView):
    """Просмотр выручки и сводки конкретного магазина администратором"""
    permission_classes = [IsAdminUser]

    def get(self, request, store_id):
        # Находим магазин по ID, чтобы вытащить его реального владельца
        store = get_object_or_404(Store, id=store_id)
        # Подменяем request.user на store.owner в вашей готовой логике
        return Response(build_sales_overview(store.owner, store.id))


class AdminStoreAnalyticsProductsView(APIView):
    """Просмотр товаров по выручке конкретного магазина администратором"""
    permission_classes = [IsAdminUser]

    def get(self, request, store_id):
        store = get_object_or_404(Store, id=store_id)
        limit = request.query_params.get("limit", 10)
        return Response(build_products_analytics(store.owner, store.id, limit))


class AdminStoreAnalyticsLowStockView(APIView):
    """Просмотр критического остатка товаров конкретного магазина администратором"""
    permission_classes = [IsAdminUser]

    def get(self, request, store_id):
        store = get_object_or_404(Store, id=store_id)
        threshold = _parse_threshold(request.query_params.get("threshold"))
        return Response(build_low_stock(store.owner, store.id, threshold))


class AdminStoreAnalyticsQualityView(APIView):
    """Просмотр качества и оценок конкретного магазина администратором"""
    permission_classes = [IsAdminUser]

    def get(self, request, store_id):
        store = get_object_or_404(Store, id=store_id)
        return Response(build_store_quality(store.owner, store.id))
