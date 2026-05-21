from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from datetime import timedelta
from .models import AIChatHistory
from ml.llm_client import generate_response


class AIChatView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response({'error': 'Message is required'}, status=400)

        try:
            # Загружаем историю: последние 10 сообщений за 24 часа
            chat_history = []
            if request.user and request.user.is_authenticated:
                time_threshold = timezone.now() - timedelta(hours=24)
                history_qs = AIChatHistory.objects.filter(
                    user=request.user,
                    created_at__gte=time_threshold
                ).order_by('-created_at')[:10]
                
                # Форматируем: [старые -> новые]
                chat_history = [
                    {
                        'user': entry.query,
                        'assistant': entry.response
                    }
                    for entry in reversed(history_qs)  # Разворачиваем чтобы старые были первыми
                ]

            # Запрос к LLM с историей
            ai_text = generate_response(user_message, chat_history)

            # Сохраняем в историю
            if request.user and request.user.is_authenticated:
                AIChatHistory.objects.create(
                    user=request.user,
                    query=user_message,
                    response=ai_text,
                    context_products=[],
                    response_type='text_only'
                )

            return Response({
                'message': ai_text,
                'products': [],
                'type': 'text_only'
            })

        except Exception as e:
            print(f"❌ Ошибка в AIChatView: {e}")
            return Response({
                'message': 'Извините, сервис временно недоступен.',
                'products': [],
                'type': 'error'
            }, status=500)