from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .analytics_views import (
    SellerAnalyticsLowStockView,
    SellerAnalyticsOverviewView,
    SellerAnalyticsProductsView,
    SellerAnalyticsQualityView,
)
from .views import SellerOrderViewSet, SellerProductViewSet


router = DefaultRouter()
router.register(r"products", SellerProductViewSet, basename="seller-products")
router.register(r"orders", SellerOrderViewSet, basename="seller-orders")


urlpatterns = [
    path("analytics/overview/", SellerAnalyticsOverviewView.as_view(), name="seller-analytics-overview"),
    path("analytics/products/", SellerAnalyticsProductsView.as_view(), name="seller-analytics-products"),
    path("analytics/low-stock/", SellerAnalyticsLowStockView.as_view(), name="seller-analytics-low-stock"),
    path("analytics/quality/", SellerAnalyticsQualityView.as_view(), name="seller-analytics-quality"),
    path("", include(router.urls)),
]
