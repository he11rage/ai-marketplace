import os
from gigachat import GigaChat
import json
import re

class GigaChatClient:
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        auth_key = os.getenv('GIGACHAT_AUTHORIZATION_KEY')
        
        if not auth_key:
            print("❌ GIGACHAT_AUTHORIZATION_KEY не найден!")
            self.client = None
            return
            
        try:
            self.client = GigaChat(
                credentials=auth_key,
                scope="GIGACHAT_API_PERS",
                verify_ssl_certs=False,
            )
            print("✅ GigaChat клиент инициализирован")
        except Exception as e:
            print(f"❌ Ошибка: {e}")
            self.client = None

    def detect_intent(self, user_query: str) -> dict:
        """
        Определяет намерение: поиск товаров или общение.
        ГИБРИДНЫЙ ПОДХОД: сначала ключевые слова, потом LLM.
        """
        query_lower = user_query.lower().strip()
        
        # === ШАГ 1: Быстрая проверка по ключевым словам ===
        search_keywords = [
            'найди', 'покажи', 'хочу', 'купить', 'искать', 'подбери', 
            'посоветуй', 'рекомендуй', 'есть ли', 'какие есть',
            'цена', 'стоимость', 'сколько стоит', 'куплю',
            'где купить', 'в наличии', 'заказать'
        ]
        
        # Если есть явные маркеры поиска — сразу возвращаем
        if any(keyword in query_lower for keyword in search_keywords):
            # Извлекаем что искать (упрощённо)
            # Убираем служебные слова
            clean_query = re.sub(
                r'(найди|покажи|хочу|купить|искать|подбери|посоветуй|рекомендуй|где|куплю|заказать)\s*',
                '',
                query_lower
            )
            # Убираем вопросы
            clean_query = clean_query.strip('?.,! ')
            
            if clean_query and len(clean_query) > 2:
                print(f"✅ [KEYWORDS] Поиск: '{clean_query}'")
                return {
                    "needs_search": True,
                    "search_query": clean_query,
                    "is_greeting": False,
                    "method": "keywords"
                }
        
        # === ШАГ 2: Проверка на приветствие ===
        greetings = ['привет', 'здравствуй', 'добрый', 'hello', 'hi', 'ку', 'прив']
        if any(greeting in query_lower for greeting in greetings):
            print(f"✅ [KEYWORDS] Приветствие")
            return {
                "needs_search": False,
                "search_query": None,
                "is_greeting": True,
                "method": "keywords"
            }
        
        # === ШАГ 3: Если не понятно — спрашиваем LLM ===
        print(f"🤔 [LLM] Не понятно по ключевым словам, спрашиваю GigaChat...")
        return self._detect_intent_with_llm(user_query)

    def _detect_intent_with_llm(self, user_query: str) -> dict:
        """
        Определяет намерение через LLM (резервный метод)
        """
        prompt = f"""Ты классификатор намерений в маркетплейсе.

Запрос: "{user_query}"

Определи:
1. **needs_search** — хочет ли пользователь найти товары? (True/False)
   Ищи: "найди", "покажи", "хочу купить", "подбери", "посоветуй", "цена", "сколько стоит"
   
2. **search_query** — если needs_search=True, извлеки ЧТО искать

Верни ТОЛЬКО JSON:
{{
    "needs_search": true/false,
    "search_query": "что искать" или null,
    "is_greeting": true/false
}}

Примеры:
"Привет!" → {{"needs_search": false, "search_query": null, "is_greeting": true}}
"Найди наушники" → {{"needs_search": true, "search_query": "наушники", "is_greeting": false}}

Ответ:"""

        try:
            response = self.client.chat(prompt, temperature=0.1)
            result_text = response.choices[0].message.content.strip()
            
            # Парсим JSON
            result = json.loads(result_text)
            print(f"✅ [LLM] Интент: {result}")
            return result
            
        except Exception as e:
            print(f"⚠️ [LLM] Ошибка: {e}")
            # Fallback: считаем что это общение
            return {
                "needs_search": False,
                "search_query": None,
                "is_greeting": True,
                "method": "fallback"
            }

    def generate_chat_response(self, user_query: str, found_products: list = None) -> str:
        """Генерирует ответ в режиме общения"""
        prompt = f"""Ты дружелюбный AI-помощник маркетплейса MarketFlow.

Запрос: "{user_query}"

Отвечай:
- Кратко (2-3 предложения)
- Дружелюбно
- Если спрашивают про товары — предложи помощь: "Хочешь, помогу найти?"
- БЕЗ markdown

Ответ:"""

        try:
            response = self.client.chat(prompt)
            return response.choices[0].message.content.strip()
        except Exception as e:
            return "Привет! Чем могу помочь?"

    def generate_search_response(self, user_query: str, found_products: list) -> str:
        """Генерирует ответ когда найдены товары"""
        if not found_products:
            return "К сожалению, ничего не нашёл. Попробуй изменить запрос или посмотреть другие категории."

        products_text = "\n".join([
            f"- {p.get('name')}: {p.get('price', 0)}₽" 
            for p in found_products[:3]
        ])

        prompt = f"""Пользователь искал: "{user_query}"

Нашёл {len(found_products)} товаров:
{products_text}

Комментарий (1-2 предложения):
- Упомяни что нашёл
- Если есть лучший вариант — выдели его
- БЕЗ markdown

Ответ:"""

        try:
            response = self.client.chat(prompt)
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Нашёл {len(found_products)} товаров — посмотри варианты ниже!"

gigachat_client = GigaChatClient()

def detect_intent(user_query: str) -> dict:
    return gigachat_client.detect_intent(user_query)

def generate_chat_response(user_query: str, found_products: list = None) -> str:
    return gigachat_client.generate_chat_response(user_query, found_products)

def generate_search_response(user_query: str, found_products: list) -> str:
    return gigachat_client.generate_search_response(user_query, found_products)