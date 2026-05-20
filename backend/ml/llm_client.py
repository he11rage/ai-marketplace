import os
from gigachat import GigaChat

class GigaChatClient:
    def __init__(self):
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        # Проверяем что загружено
        print(f"\n🔍 Проверяю переменные окружения:")
        print(f"   CLIENT_ID: {os.getenv('GIGACHAT_CLIENT_ID', 'НЕ НАЙДЕН')[:20] if os.getenv('GIGACHAT_CLIENT_ID') else 'НЕ НАЙДЕН'}...")
        print(f"   AUTH_KEY: {os.getenv('GIGACHAT_AUTHORIZATION_KEY', 'НЕ НАЙДЕН')[:20] if os.getenv('GIGACHAT_AUTHORIZATION_KEY') else 'НЕ НАЙДЕН'}...")
        print(f"   SCOPE: {os.getenv('GIGACHAT_SCOPE', 'НЕ НАЙДЕН')}")

        auth_key = os.getenv('GIGACHAT_AUTHORIZATION_KEY')

        if not auth_key:
            print("❌ GIGACHAT_AUTHORIZATION_KEY не найден!")
            self.client = None
            return

        try:
            self.client = GigaChat(
                credentials=auth_key,
                scope=os.getenv('GIGACHAT_SCOPE', 'GIGACHAT_API_PERS'),
                verify_ssl_certs=False,
            )
            print("✅ GigaChat клиент инициализирован")
        except Exception as e:
            print(f"❌ Ошибка инициализации: {e}")
            self.client = None

    def generate_response(self, user_query: str, found_products: list, chat_history: list = []) -> str:
        print(f"\n🤖 Запрос к AI: '{user_query}'")
        print(f"📦 Найдено товаров: {len(found_products)}")

        if not self.client:
            print("❌ GigaChat клиент не инициализирован")
            return "⚠️ AI-помощник временно недоступен. Проверь настройки."

        # Формируем список товаров для контекста
        if found_products:
            products_text = "\n".join([
                f"- {p.get('name', 'Без названия')} ({p.get('brand', 'No brand')}): {p.get('price', 0)}₽"
                for p in found_products
            ])
        else:
            products_text = "Товары не найдены."

        # Формируем промпт
        if found_products:
            prompt = f"""Ты — дружелюбный и краткий AI-помощник маркетплейса.

Запрос пользователя: "{user_query}"

Я нашел {len(found_products)} подходящих товаров:
{products_text}

Твоя задача:
1. Дай короткий комментарий (1-2 предложения) о найденных товарах
2. Упомяни 1-2 лучших варианта, если они есть
3. Будь полезен и дружелюбен
4. ОТВЕЧАЙ НА РУССКОМ ЯЗЫКЕ
5. НЕ используй markdown, звёздочки, решётки

Пример хорошего ответа:
"Нашёл отличные наушники! Советую присмотреться к Sony — у них лучшее шумоподавление в этой цене."

Твой ответ:"""
        else:
            prompt = f"""Ты — дружелюбный AI-помощник маркетплейса.

Пользователь ищет: "{user_query}"

К сожалению, я не нашел подходящих товаров.
Дай короткий полезный совет (1-2 предложения), что можно сделать:
- Попробовать другой запрос
- Посмотреть другие категории
- Подождать поступления

Отвечай на русском, кратко и по-человечески.

Твой ответ:"""

        try:
            print("📡 Отправляю запрос в GigaChat...")
            # Вызов API — передаем строку, как требует библиотека
            response = self.client.chat(prompt)

            if response and response.choices and response.choices[0].message:
                ai_text = response.choices[0].message.content.strip()
                print(f"✅ Ответ от AI: {ai_text[:100]}...")
                return ai_text
            else:
                print("❌ GigaChat вернул пустой ответ")
                return "Извините, я не могу сгенерировать ответ прямо сейчас."

        except Exception as e:
            print(f"❌ Ошибка при запросе к GigaChat: {e}")
            return f"Произошла техническая ошибка. Но я нашел {len(found_products)} товаров — посмотрите их!"

# Глобальный экземпляр клиента
gigachat_client = GigaChatClient()

# Обертка для совместимости с views.py
def generate_ai_response(user_query: str, found_products: list, chat_history: list = []) -> str:
    return gigachat_client.generate_response(user_query, found_products, chat_history)
