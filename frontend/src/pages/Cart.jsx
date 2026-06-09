import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

export default function Cart() {
  const navigate = useNavigate();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState('');
  const {
    items,
    removeFromCart,
    updateQuantity,
    updateSelected,
    toggleAll,
    checkout,
    selectedTotal,
    selectedCount,
    allSelected,
    isCheckingOut,
    isSelectionUpdating,
  } = useCart();

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  const handleCheckout = () => {
    const address = deliveryAddress.trim();

    setCheckoutError('');
    setCheckoutSuccess('');

    if (selectedCount === 0) {
      setCheckoutError('Выберите хотя бы один товар для оформления.');
      return;
    }

    if (!address) {
      setCheckoutError('Введите адрес доставки.');
      return;
    }

    checkout(
      {
        delivery_address: address,
        payment_method: paymentMethod,
      },
      {
        onSuccess: (response) => {
          setDeliveryAddress('');
          setCheckoutSuccess(`Заказ #${response.data.id} успешно оформлен.`);
          navigate('/account', { state: { tab: 'orders' } });
        },
        onError: (error) => {
          const details = error.response?.data;
          const message = typeof details === 'string'
            ? details
            : details?.detail || details?.non_field_errors?.[0] || 'Не удалось оформить заказ.';

          setCheckoutError(message);
        },
      }
    );
  };

  if (items.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-12">
        <EmptyState
          title="Ваша корзина пуста"
          description="Похоже, вы еще ничего не добавили. Посмотрите наши популярные товары!"
          icon="cart"
        />
      </div>
    );
  }

  const shipping = selectedTotal > 100 || selectedTotal === 0 ? 0 : 9;
  const finalTotal = selectedTotal + shipping;

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Корзина ({items.length} товара)</h1>
      </div>

      <div className="flex gap-8 items-start">
        {/* Левый блок: Список товаров */}
        <div className="flex-1 bg-white rounded-2xl shadow-subtle p-6">
          {/* Выбрать все */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-2">
            <input
              type="checkbox"
              checked={allSelected}
              disabled={isSelectionUpdating}
              onChange={(e) => toggleAll(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF] cursor-pointer"
            />
            <label className="font-semibold text-sm text-gray-800 cursor-pointer">Выбрать все</label>
          </div>

          {/* Рендеринг товаров в корзине */}
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-5 py-4 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 rounded-xl px-2 -mx-2 transition group relative"
              onClick={() => handleProductClick(item.id)}
            >
              {/* Чекбокс товара */}
              <input
                type="checkbox"
                checked={item.selected}
                disabled={isSelectionUpdating}
                className="w-5 h-5 rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF] cursor-pointer"
                onChange={(e) => {
                  e.stopPropagation();
                  updateSelected(item.id, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
              />

              {/* Картинка: Фиксированный квадрат + object-contain (без обрезки!) */}
              <div className="w-24 h-24 rounded-xl bg-[#F2F2F7] flex-shrink-0 overflow-hidden flex items-center justify-center p-1.5 border border-gray-100">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#f0f4ff] to-[#e8f0ff]" />
                )}
              </div>

              {/* Информация о товаре */}
              <div className="flex-1 min-w-0 py-1">
                <h3 className="font-medium text-sm text-gray-800 mb-1 line-clamp-1 group-hover:text-[#007AFF] transition">{item.name}</h3>

                {/* Полезный мета-тег вместо огромного описания */}
                <p className="text-xs text-gray-400 mb-3 font-medium">
                  {item.category_name || item.store_name ? `Каталог: ${item.category_name || 'Товары'}` : 'В наличии'}
                </p>

                {/* Счётчик количества */}
                <div className="flex items-center bg-[#F2F2F7] w-fit rounded-xl p-0.5 border border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}
                    className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-bold text-sm text-gray-600 hover:bg-gray-50 active:scale-95 shadow-sm transition cursor-pointer"
                  >-</button>
                  <span className="font-semibold text-sm w-8 text-center text-gray-800">{item.quantity}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }}
                    className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-bold text-sm text-gray-600 hover:bg-gray-50 active:scale-95 shadow-sm transition cursor-pointer"
                  >+</button>
                </div>
              </div>

              {/* Цены: Общая + цена за штуку */}
              <div className="text-right flex flex-col justify-center min-w-24 pl-2">
                <div className="font-bold text-base text-gray-900 mb-0.5">{item.price * item.quantity}₽</div>
                <div className="text-[11px] font-medium text-gray-400">{item.price}₽ / шт.</div>
                {item.oldPrice && (
                  <span className="text-xs text-gray-400 line-through mt-1">{item.oldPrice * item.quantity}₽</span>
                )}
              </div>

              {/* Удаление: Изменено на аккуратный красный Apple-style */}
              <button
                onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-[#FF3B30]/10 hover:text-[#FF3B30] transition cursor-pointer shrink-0"
                title="Удалить"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Правый блок: Итого и Оформление */}
        <div className="w-88 h-fit shrink-0">
          <div className="bg-white rounded-2xl shadow-subtle p-6 sticky top-24 border border-gray-100/50">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Итого</h3>

            {/* Калькуляция цен */}
            <div className="space-y-2.5 text-sm mb-4 pb-4 border-b border-gray-100">
              <div className="flex justify-between">
                <span className="text-gray-400">Выбрано товаров</span>
                <span className="font-semibold text-gray-800">{selectedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Подытог</span>
                <span className="font-semibold text-gray-800">{selectedTotal}₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Доставка</span>
                <span className={shipping === 0 ? 'text-[#34C759] font-semibold' : 'font-semibold text-gray-800'}>
                  {shipping === 0 ? 'Бесплатно' : `${shipping}₽`}
                </span>
              </div>
            </div>

            {/* Финальная цена */}
            <div className="mb-5 flex justify-between items-baseline">
              <span className="font-bold text-gray-900">Всего к оплате</span>
              <span className="font-black text-2xl text-[#007AFF]">{finalTotal}₽</span>
            </div>

            {/* Инпуты ввода параметров */}
            <div className="space-y-4 mb-4">
              {/* Адрес доставки с иконкой геолокации */}
              <div className="relative">
                <div className="absolute top-3.5 left-4 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full min-h-20 pl-10 pr-4 py-3 rounded-xl bg-[#F2F2F7] border border-transparent text-sm font-medium text-gray-800 placeholder-gray-400 focus:bg-white focus:border-[#007AFF] outline-none transition resize-none leading-relaxed"
                  placeholder="Укажите адрес доставки..."
                />
              </div>

              {/* Способ оплаты с интерактивной иконкой и стрелочкой */}
              <div className="relative">
                <div className="absolute top-3.5 left-4 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full pl-10 pr-10 py-3.5 rounded-xl bg-[#F2F2F7] border border-transparent text-sm font-semibold text-gray-700 focus:bg-white focus:border-[#007AFF] outline-none transition cursor-pointer appearance-none"
                >
                  <option value="card">Банковская карта</option>
                  <option value="sbp">Система быстрых платежей (СБП)</option>
                  <option value="cash">При получении заказа</option>
                </select>
                <div className="absolute top-4.5 right-4 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Ошибки и Статусы валидации от бэкенда */}
            {checkoutError && (
              <p className="mb-3 text-sm font-medium text-[#FF3B30] bg-[#FF3B30]/5 px-3 py-2 rounded-lg">
                {checkoutError}
              </p>
            )}
            {checkoutSuccess && (
              <p className="mb-3 text-sm font-medium text-[#34C759] bg-[#34C759]/5 px-3 py-2 rounded-lg">
                {checkoutSuccess}
              </p>
            )}

            {/* Кнопка действия */}
            <Button
              className="w-full mb-4 py-3 rounded-xl font-bold text-sm shadow-md transition transform active:scale-98"
              onClick={handleCheckout}
              disabled={isCheckingOut || selectedCount === 0}
            >
              {isCheckingOut ? 'Оформляем...' : 'Оформить заказ'}
            </Button>

            {/* Бейдж безопасности Stripe с иконкой замка */}
            <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Безопасная оплата через Stripe</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

