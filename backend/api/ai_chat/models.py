from django.db import models
from django.conf import settings

class AIChatHistory(models.Model):
    """История чата с ИИ-помощником"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_histories'
    )
    query = models.TextField(help_text="Запрос пользователя")
    response = models.TextField(help_text="Ответ ИИ")
    context_products = models.JSONField(
        null=True, 
        blank=True, 
        help_text="ID товаров, использованных в контексте"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_chat_history'
        verbose_name = 'AI Chat History'
        verbose_name_plural = 'AI Chat Histories'

    def __str__(self):
        return f"Chat with {self.user.username} at {self.created_at}"