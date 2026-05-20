from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from django.db import models
from django.utils import timezone

from .models import AIChatHistory
from ml.rag_pipeline import search_similar_products
from ml.llm_client import detect_intent, generate_chat_response, generate_search_response
from api.products.serializers import ProductSerializer


class AIChatView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response({'error': 'Message is required'}, status=400)

        try:
            # 1. Определяем намерение
            intent = detect_intent(user_message)
            needs_search = intent.get('needs_search', False)
            search_query = intent.get('search_query')

            # 2. Обрабатываем в зависимости от намерения
            if needs_search and search_query:
                # ПОИСК ТОВАРОВ
                print(f"🔍 Поиск: {search_query}")
                products_qs = search_similar_products(search_query, limit=5, threshold=0.3)
                products_data = ProductSerializer(products_qs, many=True).data
                
                # Генерируем ответ про найденные товары
                ai_text = generate_search_response(user_message, products_data)
                response_type = 'with_products' if products_data else 'text_only'
            else:
                # ПРОСТО ОБЩЕНИЕ
                print("💬 Режим общения")
                ai_text = generate_chat_response(user_message)
                products_data = []
                response_type = 'text_only'

            # 3. Сохраняем в историю
            if request.user and request.user.is_authenticated:
                AIChatHistory.objects.create(
                    user=request.user,
                    query=user_message,
                    response=ai_text,
                    context_products=products_data if needs_search else [],
                    response_type=response_type
                )

            # 4. Возвращаем ответ
            return Response({
                'message': ai_text,
                'products': products_data,
                'type': response_type,
                'intent': intent  # Для отладки
            })

        except Exception as e:
            print(f"❌ Ошибка в AIChatView: {e}")
            return Response({
                'message': 'Извините, сейчас я не могу обработать запрос.',
                'products': [],
                'type': 'error'
            }, status=500)


class ProductRecommendationsView(APIView):
    """Возвращает похожие товары для карточки (блок Similar)"""
    permission_classes = [AllowAny]
    
    def get(self, request, product_id):
        try:
            similar = get_product_recommendations(product_id, limit=4)
            serializer = ProductSerializer(similar, many=True)
            return Response({'similar_products': serializer.data})
        except Exception as e:
            return Response({'similar_products': []}, status=200)


class AIUsageStatsView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Безопасная агрегация (если записей нет, вернёт None → заменяем на 0)
        stats = AIChatHistory.objects.filter(created_at__gte=month_start).aggregate(
            total_used=models.Sum('total_tokens') or 0,
            requests_count=models.Count('id') or 0
        )
        
        limit = 1_000_000
        used = stats['total_used'] if stats['total_used'] is not None else 0
        
        return Response({
            'used_tokens': used,
            'remaining_tokens': limit - used,
            'usage_percent': round((used / limit) * 100, 2) if limit > 0 else 0,
            'total_requests': stats['requests_count'],
            'limit': limit
        })