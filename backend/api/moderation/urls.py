from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminActionLogViewSet,
    AIChatHistoryAdminViewSet,
    OrdersModerationViewSet,
    ProductModerationViewSet,
    ReportModerationViewSet,
    StoreModerationViewSet,
    UsersAdminViewSet,
)


router = DefaultRouter()
router.register(r"products", ProductModerationViewSet, basename="moderation-products")
router.register(r"stores", StoreModerationViewSet, basename="moderation-stores")
router.register(r"reports", ReportModerationViewSet, basename="moderation-reports")
router.register(r"users", UsersAdminViewSet, basename="moderation-users")
router.register(r"orders", OrdersModerationViewSet, basename="moderation-orders")
router.register(r"ai-history", AIChatHistoryAdminViewSet, basename="moderation-ai-history")
router.register(r"audit", AdminActionLogViewSet, basename="moderation-audit")


urlpatterns = [
    path("", include(router.urls)),
]

