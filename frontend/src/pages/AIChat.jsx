import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useWishlist } from '../hooks/useWishlist';
import { apiEndpoints } from '../api/axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AIChat() {
  const navigate = useNavigate();
  const { toggle: toggleWishlist, isInWishlist } = useWishlist();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: '👋 Привет! Я ваш AI-консультант MarketFlow. Что ищем сегодня?',
      sender: 'ai',
      type: 'text',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const newUserMsg = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      type: 'text',
    };
    const userMessage = inputValue;
    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = buildHistoryPayload(messages);

      const response = await fetch(`${API_URL}/api/ai/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
        body: JSON.stringify({ message: userMessage, history }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.debug_error || data.message || data.error || 'Ошибка сервера');
      }

      const nextMessages = [];

      if (data.message) {
        nextMessages.push({
          id: Date.now() + 1,
          text: data.message,
          sender: 'ai',
          type: 'text',
        });
      }

      const items = data.items?.length ? data.items : null;
      if (items) {
        items.forEach((item, idx) => {
          if (item.comment) {
            nextMessages.push({
              id: Date.now() + 2 + idx * 2,
              text: item.comment,
              sender: 'ai',
              type: 'text',
            });
          }
          if (item.product) {
            nextMessages.push({
              id: Date.now() + 3 + idx * 2,
              product: item.product,
              sender: 'ai',
              type: 'product',
            });
          }
        });
      } else if (data.products?.length) {
        data.products.forEach((product, idx) => {
          nextMessages.push({
            id: Date.now() + 10 + idx,
            product,
            sender: 'ai',
            type: 'product',
          });
        });
      }

      setMessages((prev) => [...prev, ...nextMessages]);
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: `Ошибка: ${error.message}`,
          sender: 'ai',
          type: 'text',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async (productId, productName) => {
    try {
      await apiEndpoints.addToCart({ product: productId, quantity: 1 });
      alert(`✅ ${productName} добавлен в корзину!`);
    } catch (error) {
      console.error('Add to cart error:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const renderProductCard = (item) => {
    const liked = isInWishlist(item.id);

    return (
      <div className="bg-white rounded-xl p-4 shadow-subtle hover:shadow-md transition border border-[#E5E5EA]">
        <div className="flex gap-4">
          <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-[#f0f4ff] to-[#e8f0ff] flex-shrink-0 overflow-hidden flex items-center justify-center">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl">📦</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-base mb-1 truncate">{item.name}</h4>

            <div className="flex items-center gap-3 mb-2">
              <span className="text-[#007AFF] font-bold text-lg">{item.price}₽</span>
              {item.old_price && (
                <span className="text-sm text-text-secondary line-through">
                  {item.old_price}₽
                </span>
              )}
            </div>

            {item.brand && (
              <p className="text-xs text-text-secondary mb-1">Бренд: {item.brand}</p>
            )}

            {item.rating > 0 && (
              <div className="flex items-center gap-1 mb-3">
                <span className="text-[#FF9500] text-sm">★</span>
                <span className="text-sm text-text-secondary">{item.rating}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => handleAddToCart(item.id, item.name)}
                className="bg-[#007AFF] hover:bg-[#0056CC]"
              >
                В корзину
              </Button>
              <button
                type="button"
                onClick={() => toggleWishlist(item)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                  liked
                    ? 'border-[#FF3B30] text-[#FF3B30] bg-red-50'
                    : 'border-[#E5E5EA] text-text-secondary hover:border-[#FF3B30] hover:text-[#FF3B30]'
                }`}
                aria-label={liked ? 'Убрать из избранного' : 'В избранное'}
              >
                {liked ? '♥ В избранном' : '♡ В избранное'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMessage = (msg) => {
    if (msg.type === 'text') {
      return (
        <div
          key={msg.id}
          className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
            msg.sender === 'user'
              ? 'ml-auto bg-[#007AFF] text-white rounded-2xl rounded-tr-none'
              : 'mr-auto bg-[#F2F2F7] text-text-primary rounded-2xl rounded-tl-none'
          }`}
        >
          {msg.text}
        </div>
      );
    }

    if (msg.type === 'product' && msg.product) {
      return (
        <div key={msg.id} className="mr-auto w-full max-w-md">
          {renderProductCard(msg.product)}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-text-secondary hover:text-text-primary"
        >
          ← На главную
        </button>
        <h1 className="text-2xl font-bold">AI Ассистент</h1>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 bg-[#FAFAFA] rounded-2xl p-6">
        {messages.map(renderMessage)}

        {isLoading && (
          <div className="mr-auto bg-[#F2F2F7] text-text-secondary rounded-2xl rounded-tl-none px-4 py-3 text-sm">
            Печатаю...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4 bg-white border-t border-[#F2F2F7] flex gap-3 p-4 rounded-2xl">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Например: хочу наушники… или просто «привет»"
          className="flex-1 px-4 py-3 rounded-xl bg-[#F2F2F7] border border-transparent focus:bg-white focus:border-[#007AFF] outline-none text-sm"
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
