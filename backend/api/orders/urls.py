from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, YooKassaWebhookView

router = DefaultRouter()
router.register(r'', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
    path('webhook/yookassa/', YooKassaWebhookView.as_view(), name='yookassa_webhook'),
]
