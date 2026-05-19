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

            <div className="flex gap-8">
                {/* Список товаров */}
                <div className="flex-1 bg-white rounded-2xl shadow-subtle p-6 space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-[#F2F2F7]">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            disabled={isSelectionUpdating}
                            onChange={(e) => toggleAll(e.target.checked)}
                            className="w-5 h-5 rounded border-2 border-[#007AFF] text-[#007AFF]"
                        />
                        <label className="font-medium text-sm">Выбрать все</label>
                    </div>

                    {items.map(item => (
                        <div
                            key={item.id}
                            className="flex items-center gap-4 p-4 bg-[#F5F5F7] rounded-xl cursor-pointer hover:bg-[#FAFAFA] transition group"
                            onClick={() => handleProductClick(item.id)}
                        >
                            <input
                                type="checkbox"
                                checked={item.selected}
                                disabled={isSelectionUpdating}
                                className="w-5 h-5 rounded border-2 border-[#007AFF] text-[#007AFF]"
                                onChange={(e) => {
                                    e.stopPropagation();
                                    updateSelected(item.id, e.target.checked);
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />

                            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#f0f4ff] to-[#e8f0ff] flex-shrink-0 overflow-hidden">
                                {item.image && (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm mb-1 truncate group-hover:text-[#007AFF] transition">{item.name}</h3>
                                <p className="text-xs text-text-secondary mb-3">{item.specs || 'SKU: ' + (item.sku || 'N/A')}</p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}
                                        className="w-7 h-7 rounded-md bg-white flex items-center justify-center font-bold text-xs hover:bg-[#E5E5EA] transition"
                                    >-</button>
                                    <span className="font-medium text-sm w-6 text-center">{item.quantity}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }}
                                        className="w-7 h-7 rounded-md bg-white flex items-center justify-center font-bold text-xs hover:bg-[#E5E5EA] transition"
                                    >+</button>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="font-bold text-[#007AFF] mb-1">${item.price * item.quantity}</div>
                                {item.oldPrice && <span className="text-xs text-text-secondary line-through">${item.oldPrice}</span>}
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                                className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:bg-[#F2F2F7] hover:text-[#FF3B30] transition"
                                title="Удалить"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Итого */}
                <div className="w-80 h-fit space-y-4">
                    <div className="bg-white rounded-2xl shadow-subtle p-6 sticky top-24">
                        <h3 className="font-bold mb-4">Итого</h3>
                        <div className="space-y-2 text-sm mb-4">
                            <div className="flex justify-between"><span className="text-text-secondary">Выбрано товаров</span><span className="font-medium">{selectedCount}</span></div>
                            <div className="flex justify-between"><span className="text-text-secondary">Подитог</span><span className="font-medium">${selectedTotal}</span></div>
                            <div className="flex justify-between"><span className="text-text-secondary">Доставка</span><span className={shipping === 0 ? 'text-[#34C759] font-medium' : ''}>{shipping === 0 ? 'Бесплатно' : `$${shipping}`}</span></div>
                        </div>
                        <div className="border-t border-[#E5E5EA] pt-3 mb-4 flex justify-between">
                            <span className="font-bold">Всего</span>
                            <span className="font-bold text-xl text-[#007AFF]">${finalTotal}</span>
                        </div>
                        <div className="space-y-3 mb-4">
                            <textarea
                                value={deliveryAddress}
                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                className="w-full min-h-20 px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition resize-none"
                                placeholder="Адрес доставки"
                            />
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition"
                            >
                                <option value="card">Банковская карта</option>
                                <option value="sbp">СБП</option>
                                <option value="cash">При получении</option>
                            </select>
                        </div>
                        {checkoutError && <p className="mb-3 text-sm text-[#FF3B30]">{checkoutError}</p>}
                        {checkoutSuccess && <p className="mb-3 text-sm text-[#34C759]">{checkoutSuccess}</p>}
                        <Button
                            className="w-full mb-3"
                            onClick={handleCheckout}
                            disabled={isCheckingOut || selectedCount === 0}
                        >
                            {isCheckingOut ? 'Оформляем...' : 'Оформить заказ'}
                        </Button>
                        <p className="text-center text-xs text-text-secondary">Безопасная оплата через Stripe</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
