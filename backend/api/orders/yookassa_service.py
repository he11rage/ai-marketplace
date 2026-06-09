import uuid
from yookassa import Configuration, Payment
from django.conf import settings

def init_yookassa():
    Configuration.account_id = settings.YOOKASSA_SHOP_ID
    Configuration.secret_key = settings.YOOKASSA_SECRET_KEY

def create_payment(order, return_url):
    init_yookassa()

    # Создаем платеж в ЮKassa
    response = Payment.create({
        "amount": {
            "value": str(order.total_amount),
            "currency": "RUB"
        },
        "confirmation": {
            "type": "redirect",
            "return_url": return_url
        },
        "capture": True,
        "description": f"Оплата заказа №{order.id}"
    }, str(uuid.uuid4()))  # 👈 Вот тут передаем UUID как ВТОРОЙ позиционный аргумент!

    return response.id, response.confirmation.confirmation_url
