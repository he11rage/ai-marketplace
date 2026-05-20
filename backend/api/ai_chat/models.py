# backend/api/ai_chat/models.py
from django.db import models
from django.conf import settings

class AIChatHistory(models.Model):
    """Assistant chat history with analytics and UI context."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_histories'
    )
    query = models.TextField(help_text="User message")
    response = models.TextField(help_text="LLM text response")
    
    # Extra payload used by UI quick actions.
    context_products = models.JSONField(
        null=True, 
        blank=True, 
        help_text="Serialized products for sidebar cards (id, name, price, image, quick_add)"
    )
    applied_filters = models.JSONField(
        null=True, 
        blank=True, 
        help_text="Extracted filters, for example: {max_price: 3000, category: 'bathroom'}"
    )
    
    # Token accounting for usage statistics.
    prompt_tokens = models.IntegerField(default=0, help_text="Prompt tokens")
    completion_tokens = models.IntegerField(default=0, help_text="Completion tokens")
    total_tokens = models.IntegerField(default=0, help_text="Total tokens used")
    
    # Response types used by UI state handling.
    RESPONSE_TYPES = [
        ('search', 'Product Search'),
        ('recommendation', 'AI Recommendation'),
        ('fallback', 'No Results / Clarification'),
        ('transactional', 'Checkout / Status'),
    ]
    response_type = models.CharField(max_length=20, choices=RESPONSE_TYPES, default='search')
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_chat_history'
        ordering = ['-created_at']
        verbose_name = 'AI Chat Entry'
        verbose_name_plural = 'AI Chat History'

    def __str__(self):
        return f"{self.user.username} | {self.query[:30]} | {self.total_tokens} tok"