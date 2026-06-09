import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../hooks/useCart';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Компонент анимации печатания
const TypingIndicator = () => (
  <div className="mr-auto bg-[#F2F2F7] text-text-secondary rounded-2xl rounded-tl-none px-4 py-3">
    <div className="flex gap-1.5 items-center h-5">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  </div>
);

export default function AIChat() {
  const navigate = useNavigate();
  const { toggle: toggleWishlist } = useWishlist(); // isInWishlist убран, так как убрали кнопку лайка из карточки
  const { addToCart, items: cartItems } = useCart();
  
  const messagesEndRef = useRef(null);
  const carouselRef = useRef(null);
  
  // Состояния для drag-to-scroll
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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

    // Используем crypto.randomUUID() для надежной генерации ID (см. рекомендации ниже)
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
          products: productsArray,
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
    e.preventDefault(); // Предотвращаем выделение текста при перетаскивании
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Коэффициент скорости прокрутки
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  // Строгая, минималистичная карточка товара
  const renderProductCard = (item) => {
    const cartItem = cartItems.find((c) => c.id === item.id);
    const isInCart = !!cartItem;

    return (
      <a
        href={`/product/${item.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-white rounded-xl border border-[#E5E5EA] p-3 hover:shadow-md transition-shadow h-full flex flex-col items-center text-center w-40 flex-shrink-0"
      >
        {/* Блок изображения */}
        <div className="w-full aspect-square bg-white rounded-lg flex items-center justify-center mb-3 overflow-hidden">
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
          ) : (
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        {/* Название с фиксированной высотой для выравнивания */}
        <h4 className="h-8 line-clamp-2 text-xs font-medium text-text-primary mb-2 w-full leading-tight">
          {item.name}
        </h4>

        <div className="mt-auto w-full">
          {/* Цена */}
          <span className="text-[#007AFF] font-bold text-sm block mb-3">
            {item.price}₽
          </span>
          
          {/* Единая кнопка действия */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleAddToCart(item);
            }}
            className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
              isInCart
                ? 'bg-[#34C759] text-white hover:bg-[#2DA84A]'
                : 'bg-[#007AFF] text-white hover:bg-[#0056CC]'
            }`}
          >
            {isInCart ? `В корзине (${cartItem.quantity})` : 'В корзину'}
          </button>
        </div>
      </a>
    );
  };

  const renderMessage = (msg) => {
    if (msg.type === 'text') {
      return (
        <div
          key={msg.id}
          className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            msg.sender === 'user'
              ? 'ml-auto bg-[#007AFF] text-white rounded-2xl rounded-tr-none'
              : 'mr-auto bg-[#F2F2F7] text-text-primary rounded-2xl rounded-tl-none'
          }`}
        >
          {msg.text}
        </div>
      );
    }

    if (msg.type === 'products' && msg.products) {
      return (
        <div key={msg.id} className="mr-auto w-full">
          <div
            ref={carouselRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className="flex overflow-x-auto gap-4 pb-2 -mx-2 px-2 cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
        <div key={msg.id} className="mr-auto w-full max-w-md flex justify-center">
          {renderProductCard(msg.product)}
        </div>
      );
    }

    return null;
  };

  const showQuickReplies = messages.length === 1 && messages[0].sender === 'ai';
  const quickReplies = [
    'Сборка ПК: процессор и видеокарта',
    'Инвентарь для большого тенниса',
    'Тональный крем для лица',
  ];

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-text-secondary hover:text-text-primary transition"
        >
          ← На главную
        </button>
        <h1 className="text-2xl font-bold">AI Ассистент</h1>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 bg-[#FAFAFA] rounded-2xl p-6">
        {messages.map(renderMessage)}
        
        {showQuickReplies && (
          <div className="mr-auto max-w-md">
            <div className="flex flex-wrap gap-2 mt-2">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(reply)}
                  className="px-4 py-2 bg-white border border-[#E5E5EA] rounded-xl text-sm text-text-primary hover:bg-[#F2F2F7] hover:border-[#007AFF] transition shadow-sm"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && <TypingIndicator />}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4 bg-white border-t border-[#F2F2F7] flex gap-3 p-4 rounded-2xl">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Например: хочу наушники… или просто «привет»"
          className="flex-1 px-4 py-3 rounded-xl bg-[#F2F2F7] border border-transparent focus:bg-white focus:border-[#007AFF] outline-none text-sm transition"
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading}
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white hover:opacity-90 transition disabled:opacity-50"
        >
          ➤
        </button>
      </div>
    </div>
  );
}