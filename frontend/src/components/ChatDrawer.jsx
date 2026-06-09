import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '../ChatContext.jsx';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../hooks/useCart';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ChatDrawer() {
    const { isChatOpen, closeChat } = useChatContext();
    const navigate = useNavigate();

    // Исправлено: используем isInWishlist из хука напрямую
    const { toggle: toggleWishlist, isInWishlist } = useWishlist();
    const { addToCart, items: cartItems } = useCart();

    const messagesEndRef = useRef(null);
    const carouselRef = useRef(null);

    // Состояния для drag-to-scroll
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Состояния чата
    const [messages, setMessages] = useState([
        {
            id: 'init-1',
            text: 'Привет! Я ваш AI-консультант MarketFlow. Что ищем сегодня?',
            sender: 'ai',
            type: 'text',
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Автоскролл к новым сообщениям
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Формирование истории диалога для API
    const buildHistoryPayload = (msgs) => {
        const history = [];
        let pendingUser = null;
        for (const m of msgs.filter((x) => x.type === 'text' && x.text)) {
            if (m.sender === 'user') {
                if (pendingUser) {
                    history.push({ user: pendingUser, assistant: '' });
                }
                pendingUser = m.text;
            } else if (m.sender === 'ai' && pendingUser) {
                history.push({ user: pendingUser, assistant: m.text });
                pendingUser = null;
            }
        }
        if (pendingUser) {
            history.push({ user: pendingUser, assistant: '' });
        }
        return history.slice(-10);
    };

    // Универсальная функция отправки
    const sendMessage = async (textOverride) => {
        const textToSend = (textOverride || inputValue).trim();
        if (!textToSend || isLoading) return;

        const newUserMsg = {
            id: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`,
            text: textToSend,
            sender: 'user',
            type: 'text',
        };

        setMessages((prev) => [...prev, newUserMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            const history = buildHistoryPayload([...messages, newUserMsg]);
            const response = await fetch(`${API_URL}/api/ai/chat/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
                },
                body: JSON.stringify({ message: textToSend, history }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.debug_error || data.message || data.error || 'Ошибка сервера');
            }

            const nextMessages = [];

            if (data.message) {
                nextMessages.push({
                    id: crypto.randomUUID ? crypto.randomUUID() : `ai-text-${Date.now()}`,
                    text: data.message,
                    sender: 'ai',
                    type: 'text',
                });
            }

            let productsArray = [];
            if (data.items?.length) {
                const comments = data.items.map((i) => i.comment).filter(Boolean);
                if (comments.length > 0) {
                    nextMessages.push({
                        id: crypto.randomUUID ? crypto.randomUUID() : `ai-comment-${Date.now()}`,
                        text: comments.join('\n'),
                        sender: 'ai',
                        type: 'text',
                    });
                }
                productsArray = data.items.map((i) => i.product).filter(Boolean);
            } else if (data.products?.length) {
                productsArray = data.products;
            }

            if (productsArray.length > 0) {
                nextMessages.push({
                    id: crypto.randomUUID ? crypto.randomUUID() : `ai-products-${Date.now()}`,
                    products: productsArray, // Выводятся ВСЕ товары без ограничений
                    sender: 'ai',
                    type: 'products',
                });
            }

            setMessages((prev) => [...prev, ...nextMessages]);
        } catch (error) {
            console.error('AI Chat error:', error);
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID ? crypto.randomUUID() : `ai-error-${Date.now()}`,
                    text: `Ошибка: ${error.message}`,
                    sender: 'ai',
                    type: 'text',
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = () => sendMessage();

    const handleAddToCart = (item) => {
        if (!item) return;
        const existingItem = cartItems.find((c) => c.id === item.id);
        if (existingItem) {
            navigate('/cart');
            return;
        }
        addToCart({ ...item, quantity: 1 });
    };

    // Обработчики для drag-to-scroll карусели
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - carouselRef.current.offsetLeft);
        setScrollLeft(carouselRef.current.scrollLeft);
        carouselRef.current.style.cursor = 'grabbing';
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
        if (carouselRef.current) carouselRef.current.style.cursor = 'grab';
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        if (carouselRef.current) carouselRef.current.style.cursor = 'grab';
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - carouselRef.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        carouselRef.current.scrollLeft = scrollLeft - walk;
    };

    // Карточка товара с исправленным избранным
    const renderProductCard = (item) => {
        const cartItem = cartItems.find((c) => c.id === item.id);
        const isInCart = !!cartItem;
        const liked = isInWishlist(item.id); // Исправлено: используем метод из хука

        return (
            <a
                href={`/product/${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-xl border border-[#E5E5EA] p-3 hover:shadow-md transition-shadow h-full flex flex-col items-center text-center w-36 flex-shrink-0 relative group"
            >
                {/* Блок изображения с кнопкой Избранного */}
                <div className="w-full aspect-square bg-white rounded-lg flex items-center justify-center mb-3 overflow-hidden relative">
                    {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                    ) : (
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    )}

                    {/* Кнопка Избранного (Сердечко) - исправлена синхронизация */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWishlist(item);
                        }}
                        className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md shadow-sm ${liked
                            ? 'bg-[#FF3B30] text-white hover:bg-[#E0352B]'
                            : 'bg-white/80 text-gray-400 hover:text-[#FF3B30] hover:bg-white'
                            }`}
                        title={liked ? 'Удалить из избранного' : 'Добавить в избранное'}
                    >
                        <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                </div>

                {/* Название с фиксированной высотой для выравнивания */}
                <h4 className="h-8 line-clamp-2 text-xs font-medium text-gray-800 mb-2 w-full leading-tight">
                    {item.name}
                </h4>

                <div className="mt-auto w-full">
                    {/* Цена */}
                    <span className="text-[#007AFF] font-bold text-sm block mb-3">
                        {item.price}₽
                    </span>

                    {/* Кнопка действия */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            handleAddToCart(item);
                        }}
                        className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${isInCart
                            ? 'bg-[#F2F2F7] text-gray-500 hover:bg-[#E5E5EA]'
                            : 'bg-[#007AFF] text-white hover:bg-[#0056CC]'
                            }`}
                    >
                        {isInCart ? 'В корзине' : 'В корзину'}
                    </button>
                </div>
            </a>
        );
    };

    // Подсказки для пустого диалога
    const quickReplies = [
        "Что умеет Market AI",
        "Подбери подарок",
        "Посоветуй, как выбрать",
        "Аксессуары для MacBook",
        "Мониторы с IPS-матрицей"
    ];

    return (
        <>
            {/* Затемнение заднего плана */}
            <div
                onClick={closeChat}
                className={`fixed inset-0 bg-black/15 backdrop-blur-sm z-40 transition-opacity duration-300 ${isChatOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
            />

            {/* Панель чата - floating дизайн сохранен */}
            <div
                className={`fixed top-4 bottom-4 right-4 w-[450px] sm:w-[500px] bg-[#F2F2F7] rounded-3xl shadow-2xl z-50 transform transition-all duration-300 ease-out flex flex-col overflow-hidden border border-gray-100/50 ${isChatOpen
                    ? 'translate-x-0 opacity-100 scale-100'
                    : 'translate-x-12 opacity-0 scale-95 pointer-events-none'
                    }`}
            >
                {/* Хедер */}
                <div className="p-4 bg-white border-b border-[#E5E5EA] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#007AFF] shadow-[0_0_8px_#007AFF]" />
                        <span className="font-bold text-sm text-gray-900 tracking-tight">AI Ассистент MarketFlow</span>
                    </div>
                    <button
                        onClick={closeChat}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
                        title="Закрыть"
                    >
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Тело диалога - подсказки удалены отсюда */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#F2F2F7]">
                    {messages.map((msg) => {
                        if (msg.type === 'text') {
                            return (
                                <div key={msg.id} className={`flex flex-col gap-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${msg.sender === 'user'
                                        ? 'bg-[#007AFF] text-white self-end font-medium'
                                        : 'bg-white text-gray-800 self-start border border-gray-100'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        }

                        if (msg.type === 'products' && msg.products) {
                            return (
                                <div key={msg.id} className="flex flex-col gap-2 items-start w-full">
                                    {/* Контейнер карусели с drag-to-scroll - выводит ВСЕ товары */}
                                    <div
                                        ref={carouselRef}
                                        onMouseDown={handleMouseDown}
                                        onMouseLeave={handleMouseLeave}
                                        onMouseUp={handleMouseUp}
                                        onMouseMove={handleMouseMove}
                                        className="flex overflow-x-auto gap-3 pb-3 w-full scrollbar-none snap-x cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                    >
                                        {msg.products.map((product, idx) => (
                                            <div key={product.id || idx} className="flex-shrink-0">
                                                {renderProductCard(product)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        if (msg.type === 'product' && msg.product) {
                            return (
                                <div key={msg.id} className="flex flex-col gap-2 items-start w-full max-w-[85%]">
                                    {renderProductCard(msg.product)}
                                </div>
                            );
                        }

                        return null;
                    })}

                    {isLoading && (
                        <div className="flex items-center gap-1 bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3.5 w-16 self-start">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Футер с подсказками и инпутом */}
                <div className="p-4 bg-white border-t border-[#E5E5EA] shrink-0">
                    {/* ПОЛЕ ВВОДА СО СТРЕЛОЧКОЙ ОТПРАВКИ */}
                    <div className="relative flex items-center bg-[#F2F2F7] rounded-xl border border-transparent focus-within:border-[#007AFF] focus-within:bg-white transition group px-3 py-1">
                        <input
                            type="text"
                            value={inputValue} // замените на ваше имя стейта (например, input или inputValue)
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    sendMessage(inputValue);
                                    setInputValue('');
                                }
                            }}
                            placeholder="Спросить ассистента..."
                            className="w-full py-2.5 bg-transparent text-sm text-gray-800 outline-none pr-10 pl-1 placeholder-gray-400"
                        />

                        {/* Кнопка отправки */}
                        <button
                            onClick={() => {
                                sendMessage(inputValue);
                                setInputValue('');
                            }}
                            className="absolute right-2 w-8 h-8 rounded-lg bg-[#007AFF] text-white flex items-center justify-center hover:bg-[#0062CC] active:scale-95 transition shadow-sm cursor-pointer"
                            type="button"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>

                    <div className="text-center text-[10px] text-gray-400 mt-2 font-medium tracking-wide">
                        MarketFlow AI использует современные языковые модели. Проверяйте важные факты.
                    </div>
                </div>
            </div>
        </>
    );
}