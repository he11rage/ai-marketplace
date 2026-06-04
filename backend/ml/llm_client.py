import os
import json
from gigachat import GigaChat

CONSULTANT_BASE_PROMPT = """Ты — дружелюбный ИИ-консультант маркетплейса MarketFlow.
Твоя задача — помочь пользователю найти товары.
Отвечай кратко (1-2 предложения). Без markdown и списков."""

def _format_history(chat_history: list | None) -> str:
    if not chat_history:
        return ""
    parts = []
    for msg in chat_history[-10:]:
        parts.append(f"User: {msg.get('user', '')}")
        parts.append(f"Assistant: {msg.get('assistant', '')}")
    return "\n".join(parts) + "\n"

class GigaChatClient:
    def __init__(self):
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        auth_key = os.getenv("GIGACHAT_AUTHORIZATION_KEY")
        if not auth_key:
            print("⚠️ GIGACHAT_AUTHORIZATION_KEY не найден в .env")
            return
        try:
            self.client = GigaChat(
                credentials=auth_key,
                scope="GIGACHAT_API_PERS",
                verify_ssl_certs=False,
            )
            print("✅ GigaChat клиент инициализирован")
        except Exception as e:
            print(f"❌ Ошибка инициализации: {e}")

    def _chat(self, prompt: str) -> str:
        if not self.client:
            return ""
        try:
            response = self.client.chat(prompt)
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"❌ Ошибка GigaChat: {e}")
            return ""

    def analyze_and_route(self, user_message: str, chat_history: list | None = None) -> dict:
        """
        ЕДИНЫЙ вызов LLM для анализа намерения и извлечения поискового запроса.
        Возвращает: intent (SEARCH/CHAT/OFF_TOPIC) и search_query.
        """
        history_context = _format_history(chat_history)
        prompt = f"""Ты — интеллектуальный маршрутизатор маркетплейса MarketFlow.
Проанализируй сообщение и верни СТРОГО валидный JSON без markdown.

Формат JSON:
{{
  "intent": "SEARCH" | "CHAT" | "OFF_TOPIC",
  "search_query": "строка или null",
  "extracted_category": "строка или null"
}}

Правила:
1. intent="SEARCH" если пользователь хочет найти/купить товар, обустроить что-то, собрать набор, подобрать товары для цели/события/активности.
2. intent="CHAT" если это приветствие, благодарность, общий разговор без конкретного запроса.
3. intent="OFF_TOPIC" если тема не связана с покупками.
4. search_query — конкретный поисковый запрос для базы данных (3-15 слов). Для CURATED_SELECTION запрос должен содержать конкретные категории товаров.
5. extracted_category — основная категория товара если упоминается (например, "мышь", "ноутбук", "кресло"). Если нет, то null.

Примеры:
- "Хочу беспроводную мышь" → intent="SEARCH", search_query="беспроводная мышь компьютерная", extracted_category="мышь"
- "Обустрой ванну до 50000" → intent="SEARCH", search_query="ванна обустройство полотенце халат тапочки коврик шторка", extracted_category=null
- "Собери ребенка в школу" → intent="SEARCH", search_query="школа рюкзак пенал тетради ручки карандаши", extracted_category=null
- "Подбери товары для похода" → intent="SEARCH", search_query="поход палатка спальник рюкзак фонарь котелок", extracted_category=null
- "Собери рабочее место программиста" → intent="SEARCH", search_query="рабочее место монитор клавиатура мышь кресло стол лампа", extracted_category=null
- "Привет" → intent="CHAT", search_query=null, extracted_category=null
- "Какая погода?" → intent="OFF_TOPIC", search_query=null, extracted_category=null

История:
{history_context}
Сообщение: "{user_message}"
JSON:"""
        
        raw_response = self._chat(prompt)
        
        # Очистка от markdown
        raw_response = raw_response.strip()
        if raw_response.startswith("```json"):
            raw_response = raw_response[7:]
        if raw_response.startswith("```"):
            raw_response = raw_response[3:]
        if raw_response.endswith("```"):
            raw_response = raw_response[:-3]
        raw_response = raw_response.strip()

        try:
            result = json.loads(raw_response)
            return {
                "intent": result.get("intent", "CHAT").upper(),
                "search_query": result.get("search_query"),
                "extracted_category": result.get("extracted_category")
            }
        except json.JSONDecodeError:
            print(f"⚠️ Ошибка парсинга JSON от LLM. Raw: {raw_response}")
            return {
                "intent": "CHAT",
                "search_query": None,
                "extracted_category": None
            }

    def generate_chat_response(self, user_message: str, chat_history: list | None = None) -> str:
        history_context = _format_history(chat_history)
        prompt = f"""{CONSULTANT_BASE_PROMPT}
Режим: обычный дружелюбный диалог. Поиск товаров не запускай.
Кратко (1-3 предложения), как консультант MarketFlow.
История:
{history_context}
Сообщение: "{user_message}"
Ответ:"""
        text = self._chat(prompt)
        return text or "Здравствуйте! Чем могу помочь с выбором товаров на MarketFlow?"

    def generate_off_topic_response(self, user_message: str) -> str:
        prompt = f"""{CONSULTANT_BASE_PROMPT}
Пользователь задал вопрос не про покупки товаров: "{user_message}"
Вежливо (1-2 предложения) предложи обсудить, какие товары его интересуют.
Ответ:"""
        text = self._chat(prompt)
        return text or "Давайте лучше обсудим, какие товары вас интересуют — я помогу подобрать идеальный вариант на MarketFlow."

    def generate_no_results_message(self, search_query: str) -> str:
        prompt = f"""{CONSULTANT_BASE_PROMPT}
По запросу «{search_query}» в каталоге не нашлось подходящих товаров.
Честно скажи, что именно этой категории сейчас нет.
Предложи 1-2 смежные категории.
Ответ (2-3 предложения):"""
        text = self._chat(prompt)
        return text or "К сожалению, по вашему запросу пока нет подходящих товаров. Попробуйте уточнить — и я поищу снова."

gigachat_client = GigaChatClient()