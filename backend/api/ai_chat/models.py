# backend/api/ai_chat/models.py
from django.db import models
from django.conf import settings

class AIChatHistory(models.Model):
    """История чата с ИИ-помощником + аналитика + UX-контекст"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_histories'
    )
    query = models.TextField(help_text="Запрос пользователя")
    response = models.TextField(help_text="Текстовый ответ LLM")
    
    # Данные для UI (согласно исследованию: быстрые действия, минимум кликов)
    context_products = models.JSONField(
        null=True, 
        blank=True, 
        help_text="Сериализованные товары для сайдбара (id, name, price, image, quick_add)"
    )
    applied_filters = models.JSONField(
        null=True, 
        blank=True, 
        help_text="Извлечённые фильтры: {max_price: 3000, category: 'ванна'}"
    )
    
    # Учёт токенов GigaChat
    prompt_tokens = models.IntegerField(default=0, help_text="Токены запроса (вход)")
    completion_tokens = models.IntegerField(default=0, help_text="Токены ответа (выход)")
    total_tokens = models.IntegerField(default=0, help_text="Суммарный расход")
    
    # Тип ответа для UI-состояний (согласно паттернам исследования)
    RESPONSE_TYPES = [
        ('search', 'Поиск товаров'),
        ('recommendation', 'AI-рекомендация'),
        ('fallback', 'Нет результатов / Уточнение'),
        ('transactional', 'Оформление заказа / Статус')
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