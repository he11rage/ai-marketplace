from django.contrib import admin
from .models import AIChatHistory

@admin.register(AIChatHistory)
class AIChatHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'query_preview', 'total_tokens', 'response_type', 'created_at')
    list_filter = ('response_type', 'created_at')
    search_fields = ('user__username', 'query')
    readonly_fields = ('context_products', 'applied_filters')

    @admin.display(description='Запрос')
    def query_preview(self, obj):
        return obj.query[:60] + ('...' if len(obj.query) > 60 else '')