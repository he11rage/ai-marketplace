import os
import re
from gigachat import GigaChat

CONSULTANT_BASE_PROMPT = """Ты — профессиональный ИИ-консультант маркетплейса MarketFlow.
Твоя главная задача — НЕ запускать поиск сразу, а сначала собрать детали.
ЖЁСТКИЕ ПРАВИЛА:
1. ЗАПРЕЩЕНО предлагать товары или запускать поиск, пока не собрано МИНИМУМ 3 параметра:
   - Тип/категория товара (например, ноутбук, кроссовки, монитор)
   - Ключевая характеристика или бренд (например, игровой, Apple, кожаные, 4K)
   - Бюджет или ценовой диапазон (например, до 50000, эконом-класс)
2. Пока параметров меньше трёх — задавай СТРОГО ОДИН уточняющий вопрос за раз.
3. Веди диалог естественно: "Понял, ищем ноутбук. А для каких задач вам нужен — учёба, игры или работа?"
4. Если пользователь отвечает уклончиво, предложи популярные варианты в этой категории.
5. Когда собрано достаточно данных, сделай краткое резюме и спроси: "Ищем такие варианты? Запускаю поиск?"
6. Только после явного согласия ("да", "ищи", "покажи") или если пользователь сам дал все 3 параметра — разрешается переход к поиску.
7. На приветствия/small talk отвечай дружелюбно. На оффтоп вежливо возвращай к теме покупок.
8. Отвечай кратко (1-2 предложения). Без markdown, списков и лишних слов."""


def _format_history(chat_history: list | None) -> str:
    if not chat_history:
        return ""
    parts = []
    for msg in chat_history[-10:]:
        parts.append(f"User: {msg.get('user', '')}")
        parts.append(f"Assistant: {msg.get('assistant', '')}")
    return "\n".join(parts) + "\n"


def _first_token(text: str) -> str:
    return (text or "").strip().split()[0].upper() if text else ""


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

    def classify_intent(self, user_message: str, chat_history: list | None = None) -> str:
        """Возвращает: search | chat | off_topic"""
        history_context = _format_history(chat_history)
        prompt = f"""Определи намерение последнего сообщения пользователя в диалоге с консультантом маркетплейса.
Ответь РОВНО одним словом без пояснений:
- SEARCH — хочет найти/купить товар, уточняет параметры товара, соглашается на поиск («да», «ищи», «покажи» после резюме)
- CHAT — приветствие, благодарность, общий разговор о магазине без конкретного товара
- OFF_TOPIC — тема не связана с покупками на маркетплейсе

История:
{history_context}
Сообщение: "{user_message}"
Ответ:"""
        raw = self._chat(prompt)
        token = _first_token(raw)
        if token in ("SEARCH", "ПОИСК"):
            return "search"
        if token in ("OFF_TOPIC", "OFFTOPIC", "OFF-TOPIC"):
            return "off_topic"
        if token == "CHAT":
            return "chat"

    def is_ready_for_search(self, user_message: str, chat_history: list | None = None) -> bool:
        history_context = _format_history(chat_history)
        confirm_words = ("да", "давай", "ищи", "запускай", "покажи", "найди", "ок", "окей", "ага", "конечно")
        if user_message.strip().lower() in confirm_words or any(
            user_message.strip().lower().startswith(w) for w in confirm_words
        ):
            if chat_history:
                return True

        prompt = f"""{CONSULTANT_BASE_PROMPT}

Проверь историю диалога по чек-листу. Ответь YES или NO.
ЧЕК-ЛИСТ ДОПУСКА К ПОИСКУ:
1. Ясно указан тип/категория товара? (YES/NO)
2. Есть хотя бы одна ключевая характеристика, бренд или назначение? (YES/NO)
3. Указан бюджет или ценовой диапазон? (YES/NO)
4. Пользователь явно согласился на поиск ("да", "ищи", "покажи") ИЛИ самостоятельно назвал все 3 параметра? (YES/NO)

Правило: Верни YES ТОЛЬКО если выполнены пункты 1, 2 И (3 ИЛИ 4).
В остальных случаях верни NO.

История:
{history_context}
Текущее сообщение: "{user_message}"
Ответ (YES или NO):"""
        raw = self._chat(prompt)
        return _first_token(raw) == "YES"

    def build_search_query(self, user_message: str, chat_history: list | None = None) -> str:
        history_context = _format_history(chat_history)
        prompt = f"""Сформируй короткий поисковый запрос для каталога товаров (8-20 слов, русский язык).
Учти всю историю диалога и последнее сообщение. Только текст запроса, без кавычек и пояснений.

История:
{history_context}
Последнее сообщение: "{user_message}"
Поисковый запрос:"""
        query = self._chat(prompt)
        query = re.sub(r'^["\']|["\']$', "", (query or "").strip())
        if not query:
            query = user_message
        return query[:500]

    def generate_consultant_response(self, user_message: str, chat_history: list | None = None) -> str:
        history_context = _format_history(chat_history)
        prompt = f"""{CONSULTANT_BASE_PROMPT}

История диалога:
{history_context}
Текущий запрос пользователя: "{user_message}"

Учитывай контекст из истории при ответе.
Ответ:"""
        text = self._chat(prompt)
        return text or "Извините, произошла техническая ошибка. Попробуйте позже."

    def generate_chat_response(self, user_message: str, chat_history: list | None = None) -> str:
        history_context = _format_history(chat_history)
        prompt = f"""{CONSULTANT_BASE_PROMPT}

Режим: обычный дружелюбный диалог. Поиск товаров не запускай. Не задавай уточнений про товар, если пользователь просто поздоровался.
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
Вежливо (1-2 предложения) предложи обсудить, какие товары его интересуют. Не отвечай по сути сторонней темы.
Ответ:"""
        text = self._chat(prompt)
        return text or (
            "Давайте лучше обсудим, какие товары вас интересуют — "
            "я помогу подобрать идеальный вариант на MarketFlow."
        )

    def generate_product_comment(
        self,
        product_data: dict,
        search_query: str,
        user_context: str = "",
    ) -> str:
        prompt = f"""Ты консультант MarketFlow. Пользователь искал: {search_query}.
Товар: название «{product_data.get('name')}», бренд «{product_data.get('brand') or '—'}»,
цена {product_data.get('price')}₽, рейтинг {product_data.get('rating')},
описание: {(product_data.get('description') or '')[:400]}.

Напиши 1-2 коротких предложения: почему этот товар может подойти под запрос.
Без приветствий и без перечисления всех характеристик подряд. Только суть.
Ответ:"""
        text = self._chat(prompt)
        if text:
            return text
        return f"Подходит под ваш запрос: {product_data.get('name')}."

    def generate_no_results_message(self, search_query: str) -> str:
        prompt = f"""{CONSULTANT_BASE_PROMPT}

По запросу «{search_query}» в каталоге не нашлось подходящих товаров.
Вежливо сообщи об этом (2-3 предложения), предложи уточнить критерии или поискать что-то близкое.
Ответ:"""
        text = self._chat(prompt)
        return text or (
            "К сожалению, по вашему запросу на платформе пока нет подходящих товаров. "
            "Попробуйте уточнить бюджет, бренд или тип — и я поищу снова."
        )


gigachat_client = GigaChatClient()


def generate_response(user_message: str, chat_history: list | None = None) -> str:
    return gigachat_client.generate_consultant_response(user_message, chat_history)
