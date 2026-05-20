from django.urls import path
from .views import AIChatView, ProductRecommendationsView, AIUsageStatsView

urlpatterns = [
    path('chat/', AIChatView.as_view(), name='ai-chat'),
    path('recommendations/<int:product_id>/', ProductRecommendationsView.as_view(), name='product-recommendations'),
    path('usage/', AIUsageStatsView.as_view(), name='ai-usage'),
]