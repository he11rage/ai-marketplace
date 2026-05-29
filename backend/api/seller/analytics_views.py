from rest_framework.response import Response
from rest_framework.views import APIView

from .analytics import (
    _parse_store_id,
    _parse_threshold,
    build_low_stock,
    build_products_analytics,
    build_sales_overview,
    build_store_quality,
)
from .permissions import IsSeller


class SellerAnalyticsOverviewView(APIView):
    permission_classes = [IsSeller]

    def get(self, request):
        store_id = _parse_store_id(request.query_params.get("store"))
        return Response(build_sales_overview(request.user, store_id))


class SellerAnalyticsProductsView(APIView):
    permission_classes = [IsSeller]

    def get(self, request):
        store_id = _parse_store_id(request.query_params.get("store"))
        limit = request.query_params.get("limit", 10)
        return Response(build_products_analytics(request.user, store_id, limit))


class SellerAnalyticsLowStockView(APIView):
    permission_classes = [IsSeller]

    def get(self, request):
        store_id = _parse_store_id(request.query_params.get("store"))
        threshold = _parse_threshold(request.query_params.get("threshold"))
        return Response(build_low_stock(request.user, store_id, threshold))


class SellerAnalyticsQualityView(APIView):
    permission_classes = [IsSeller]

    def get(self, request):
        store_id = _parse_store_id(request.query_params.get("store"))
        return Response(build_store_quality(request.user, store_id))
