from rest_framework import serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from datetime import timedelta
from drf_spectacular.utils import extend_schema, inline_serializer
from api.products.models import Product
from api.stores.models import Store
from .models import AIChatHistory
from ml.llm_client import gigachat_client
from ml.rag_pipeline import search_products_for_chat

def _merge_history(db_history: list, client_history: list) -> list:
    """Клиентская история дополняет БД."""
    merged = list(db_history or [])
    for entry in client_history or []:
        if not isinstance(entry, dict):
            continue
        user = (entry.get("user") or entry.get("query") or "").strip()
        assistant = (entry.get("assistant") or entry.get("response") or "").strip()
        if user:
            merged.append({"user": user, "assistant": assistant})
    return merged[-10:]

def _serialize_product(product, request) -> dict:
    image_url = None
    if product.image:
        try:
            image_url = request.build_absolute_uri(product.image.url)
        except Exception:
            image_url = product.image.url
    return {
        "id": product.id,
        "name": product.name,
        "description": (product.description or "")[:300],
        "price": str(product.price),
        "old_price": str(product.old_price) if product.old_price else None,
        "brand": product.brand or "",
        "rating": float(product.rating),
        "review_count": product.review_count,
        "image": image_url,
        "category_name": product.category.name if product.category else None,
    }

class AIChatView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["ai"],
        request=inline_serializer(
            name="AIChatRequest",
            fields={
                "message": serializers.CharField(help_text="User message for the assistant."),
                "history": serializers.ListField(
                    child=serializers.DictField(),
                    required=False,
                    help_text="Optional [{user, assistant}] for session context.",
                ),
            },
        ),
        responses={
            200: inline_serializer(
                name="AIChatResponse",
                fields={
                    "message": serializers.CharField(),
                    "products": serializers.ListField(child=serializers.DictField(), default=[]),
                    "type": serializers.CharField(default="text_only"),
                },
            ),
            400: inline_serializer(
                name="AIChatValidationError",
                fields={"error": serializers.CharField(default="Message is required")},
            ),
            500: inline_serializer(
                name="AIChatServiceError",
                fields={
                    "message": serializers.CharField(default="Извините, сервис временно недоступен."),
                    "products": serializers.ListField(child=serializers.DictField(), default=[]),
                    "type": serializers.CharField(default="error"),
                },
            ),
        },
    )
    def post(self, request):
        user_message = request.data.get("message", "").strip()
        if not user_message:
            return Response({"error": "Message is required"}, status=400)

        client_history = request.data.get("history") or []

        try:
            # 1. Собираем историю
            db_history = []
            if request.user and request.user.is_authenticated:
                time_threshold = timezone.now() - timedelta(hours=24)
                history_qs = AIChatHistory.objects.filter(
                    user=request.user,
                    created_at__gte=time_threshold,
                ).order_by("-created_at")[:10]
                db_history = [
                    {"user": entry.query, "assistant": entry.response}
                    for entry in reversed(history_qs)
                ]

            chat_history = _merge_history(db_history, client_history)

            # 2. Анализируем намерение и извлекаем поисковый запрос
            analysis = gigachat_client.analyze_and_route(user_message, chat_history)
            print(f"🔍 ANALYSIS: {analysis}", flush=True)
            intent = analysis.get("intent", "CHAT")
            search_query = analysis.get("search_query")
            category_hint = analysis.get("extracted_category")
            
            response_type = "text_only"
            ai_text = ""
            products_flat = []

            # 3. Маршрутизация
            if intent == "OFF_TOPIC":
                ai_text = gigachat_client.generate_off_topic_response(user_message)
                response_type = "off_topic"

            elif intent == "CHAT" or not search_query:
                # Обычный диалог без запроса товара
                ai_text = gigachat_client.generate_chat_response(user_message, chat_history)
                response_type = "chat"

            elif intent == "SEARCH":
                # Ищем товары ВСЕГДА, если intent=SEARCH и есть search_query
                # Базовый кверисет
                base_qs = Product.objects.filter(
                    status=Product.STATUS_ACTIVE,
                    stock_quantity__gt=0,
                    store__status=Store.STATUS_ACTIVE,
                    embedding__isnull=False,
                ).select_related("store", "category")

                # 2. Мягкие фильтры по цене и параметрам (они не ломают выдачу, а чистят её)
                import re
                user_msg_lower = user_message.lower()
                
                # Фильтр цены
                price_match = re.search(r'(?:до|меньше|дешевле)\s*(\d+)', user_msg_lower)
                if price_match:
                    base_qs = base_qs.filter(price__lte=int(price_match.group(1)))
                
                # Фильтр диагонали телевизора
                diagonal_match = re.search(r'(\d+)\s*(?:дюйм|")', user_msg_lower)
                if diagonal_match:
                    base_qs = base_qs.filter(name__icontains=diagonal_match.group(1))

                # 3. УМНЫЙ ФИЛЬТР КАТЕГОРИИ (Проверяем, есть ли товары)
                if category_hint:
                    # Пробуем отфильтровать по категории
                    category_qs = base_qs.filter(category__name__icontains=category_hint)
                    
                    # Если с такой категорией хоть что-то нашлось — используем этот кверисет!
                    if category_qs.exists():
                        base_qs = category_qs
                    else:
                        # Если товаров 0, значит LLM извлекла плохой hint (например "подарок").
                        # Мы НЕ фильтруем жестко, чтобы не было нуля, а просто добавляем 
                        # ключевое слово в текстовый поиск, чтобы вектор вытащил что нужно.
                        search_query = f"{category_hint} {search_query}"

                # Оптимизируем запросы
                base_qs = base_qs.select_related("store", "category")

                # Поиск (ищем до 5 товаров, или сколько найдётся)
                search_results = search_products_for_chat(
                    search_query,
                    base_queryset=base_qs,
                    min_vector_similarity=0.3,  # Мягкий порог
                    extracted_category=category_hint,
                )

                if not search_results:
                    ai_text = gigachat_client.generate_no_results_message(search_query)
                    response_type = "no_results"
                else:
                    # Формируем ответ
                    count = len(search_results)
                    ai_text = f"Нашёл {count} {_plural_products(count)} по вашему запросу. Вот что могу порекомендовать:"
                    response_type = "search"

                    for row in search_results:
                        product_data = _serialize_product(row["product"], request)
                        products_flat.append(product_data)

            # 4. Сохранение в историю
            history_response_type = {
                "search": "search",
                "no_results": "fallback",
                "chat": "fallback",
                "off_topic": "fallback",
            }.get(response_type, "search")

            if request.user and request.user.is_authenticated:
                AIChatHistory.objects.create(
                    user=request.user,
                    query=user_message,
                    response=ai_text,
                    context_products=products_flat or None,
                    response_type=history_response_type,
                )

            return Response(
                {
                    "message": ai_text,
                    "products": products_flat,
                    "type": response_type,
                }
            )

        except Exception as e:
            print(f"❌ Ошибка в AIChatView: {e}")
            return Response(
                {
                    "message": "Извините, сервис временно недоступен.",
                    "products": [],
                    "type": "error",
                },
                status=500,
            )

def _plural_products(n: int) -> str:
    if 11 <= n % 100 <= 14:
        return "вариантов"
    r = n % 10
    if r == 1:
        return "вариант"
    if 2 <= r <= 4:
        return "варианта"
    return "вариантов"