from django.urls import include, path
from rest_framework.routers import DefaultRouter

# Импортируем админские эндпоинты локально из текущей папки moderation
from .admin_analytics_views import (
    AdminStoreAnalyticsLowStockView,
    AdminStoreAnalyticsOverviewView,
    AdminStoreAnalyticsProductsView,
    AdminStoreAnalyticsQualityView,
)

from .views import (
    AdminActionLogViewSet,
    AIChatHistoryAdminViewSet,
    CategoryModerationViewSet,
    OrdersModerationViewSet,
    ProductModerationViewSet,
    ReportModerationViewSet,
    StoreModerationViewSet,
    UsersAdminViewSet,
)

router = DefaultRouter()
router.register(r"products", ProductModerationViewSet, basename="moderation-products")
router.register(r"categories", CategoryModerationViewSet, basename="moderation-categories")
router.register(r"stores", StoreModerationViewSet, basename="moderation-stores")
router.register(r"reports", ReportModerationViewSet, basename="moderation-reports")
router.register(r"users", UsersAdminViewSet, basename="moderation-users")
router.register(r"orders", OrdersModerationViewSet, basename="moderation-orders")
router.register(r"ai-history", AIChatHistoryAdminViewSet, basename="moderation-ai-history")
router.register(r"audit", AdminActionLogViewSet, basename="moderation-audit")

urlpatterns = [
    path("stores/<int:store_id>/analytics/overview/", AdminStoreAnalyticsOverviewView.as_view(), name="admin-store-analytics-overview"),
    path("stores/<int:store_id>/analytics/products/", AdminStoreAnalyticsProductsView.as_view(), name="admin-store-analytics-products"),
    path("stores/<int:store_id>/analytics/low-stock/", AdminStoreAnalyticsLowStockView.as_view(), name="admin-store-analytics-low-stock"),
    path("stores/<int:store_id>/analytics/quality/", AdminStoreAnalyticsQualityView.as_view(), name="admin-store-analytics-quality"),

    path("", include(router.urls)),
]
