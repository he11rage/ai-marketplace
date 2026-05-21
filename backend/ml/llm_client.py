import os
from gigachat import GigaChat

class GigaChatClient:
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        auth_key = os.getenv('GIGACHAT_AUTHORIZATION_KEY')
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

    def generate_response(self, user_message: str, chat_history: list = None) -> str:
        """Запрос к LLM с историей диалога"""
        if not self.client:
            return "⚠️ AI-помощник временно недоступен."

        # Форматируем историю
        history_context = ""
        if chat_history:
            history_parts = []
            for msg in chat_history[-10:]:  # Берём последние 10
                history_parts.append(f"User: {msg['user']}")
                history_parts.append(f"Assistant: {msg['assistant']}")
            history_context = "\n".join(history_parts) + "\n"

        prompt = f"""Ты — профессиональный ИИ-консультант по продажам на маркетплейсе MarketFlow. 
        Твоя цель — помочь пользователю сформулировать его идеальный запрос, собрать все требования к товару и подвести к поиску. 
        Правила ведения диалога: 1. Общайся кратко (1-3 предложения), задавай строго один точечный вопрос за раз. 
        2. Никогда не игнорируй контекст прошлых сообщений. Если пользователь уже выбрал категорию (например, Электронику), развивай тему внутри этой категории. 
        Не предлагай товары из других категорий (например, одежду). 
        3. Веди пользователя по пайплайну: - Сначала пойми конкретный тип устройства/товара (например: монитор, наушники, кресло). 
        - Затем уточни технические требования или бренд (например: 'механическая клавиатура', '4К монитор'). 
        - В конце аккуратно спроси про желаемый бюджет. 
        ОГРАНИЧЕНИЕ: Конкретных товаров в чат пока не выводи. 
        Если пользователь определился, сделай резюме: «Отлично, ищем [Тип] с характеристиками [Свойства] в бюджете [Цена]. Запускаю поиск?»

История диалога:
{history_context}

Текущий запрос пользователя: "{user_message}"

Учитывай контекст из истории при ответе.
Ответ:"""

        try:
            response = self.client.chat(prompt)
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"❌ Ошибка GigaChat: {e}")
            return "Извините, произошла техническая ошибка. Попробуйте позже."

# Глобальный экземпляр
gigachat_client = GigaChatClient()

def generate_response(user_message: str, chat_history: list = None) -> str:
    return gigachat_client.generate_response(user_message, chat_history)