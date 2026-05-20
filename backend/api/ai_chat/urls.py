from django.urls import path
from .views import AIChatView, AIUsageStatsView

urlpatterns = [
    path('chat/', AIChatView.as_view(), name='ai-chat'),
    path('usage/', AIUsageStatsView.as_view(), name='ai-usage'),
]
