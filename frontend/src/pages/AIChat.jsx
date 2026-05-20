import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function AIChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { id: 1, text: "👋 Привет! Я ваш AI-помощник. Что ищем сегодня?", sender: 'ai', type: 'text' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const newUserMsg = { id: Date.now(), text: inputValue, sender: 'user', type: 'text' };
    setMessages(prev => [...prev, newUserMsg]);
    const userMessage = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/ai/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();
      console.log('📥 Ответ от сервера:', data);
      
      // AI ответ с текстом (всегда добавляем)
      const aiMsg = { 
        id: Date.now() + 1, 
        text: data.message, 
        sender: 'ai',
        type: 'text'  // ← ИСПРАВЛЕНО: всегда 'text' для текстовых сообщений
      };
      setMessages(prev => [...prev, aiMsg]);
      
      // Если есть товары — добавляем их как отдельное сообщение-карточки
      if (data.products && data.products.length > 0) {
        const productsMsg = {
          id: Date.now() + 2,
          products: data.products,
          sender: 'ai',
          type: 'products'
        };
        setMessages(prev => [...prev, productsMsg]);
      }
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [
        ...prev, 
        { id: Date.now() + 1, text: "Произошла ошибка. Попробуйте позже.", sender: 'ai', type: 'text' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async (productId, productName) => {
    try {
      await fetch('http://localhost:8000/api/cart/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ product: productId, quantity: 1 })
      });
      alert(`✅ ${productName} добавлен в корзину!`);
    } catch (error) {
      console.error('Add to cart error:', error);
    }
  };

  // Рендер сообщения
  const renderMessage = (msg) => {
    // Текстовое сообщение
    if (msg.type === 'text') {
      return (
        <div key={msg.id} className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
          msg.sender === 'user' 
            ? 'ml-auto bg-[#007AFF] text-white rounded-2xl rounded-tr-none' 
            : 'mr-auto bg-[#F2F2F7] text-text-primary rounded-2xl rounded-tl-none'
        }`}>
          {msg.text}
        </div>
      );
    }
    
    // Карточки товаров (встроены в чат!)
    if (msg.type === 'products') {
      return (
        <div key={msg.id} className="mr-auto w-full max-w-2xl space-y-3">
          {msg.products.map((item, idx) => (
            <div key={item.id || idx} className="bg-white rounded-xl p-4 shadow-subtle hover:shadow-md transition border border-[#E5E5EA]">
              <div className="flex gap-4">
                {/* Placeholder для фото */}
                <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-[#f0f4ff] to-[#e8f0ff] flex-shrink-0 flex items-center justify-center text-2xl">
                  📦
                </div>
                
                <div className="flex-1">
                  <h4 className="font-semibold text-base mb-1">{item.name}</h4>
                  
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[#007AFF] font-bold text-lg">{item.price}₽</span>
                    {item.old_price && (
                      <span className="text-sm text-text-secondary line-through">{item.old_price}₽</span>
                    )}
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-text-secondary mb-2 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  {item.rating && (
                    <div className="flex items-center gap-1 mb-3">
                      <span className="text-[#FF9500] text-sm">★</span>
                      <span className="text-sm text-text-secondary">{item.rating}</span>
                    </div>
                  )}
                  
                  <Button 
                    size="sm"
                    onClick={() => handleAddToCart(item.id, item.name)}
                    className="bg-[#007AFF] hover:bg-[#0056CC]"
                  >
                    В корзину
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-6 h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-text-secondary hover:text-text-primary">
          ← На главную
        </button>
        <h1 className="text-2xl font-bold">AI Ассистент</h1>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 bg-[#FAFAFA] rounded-2xl p-6">
        {messages.map(renderMessage)}
        
        {isLoading && (
          <div className="mr-auto bg-[#F2F2F7] text-text-secondary rounded-2xl rounded-tl-none px-4 py-3">
            Печатаю...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="mt-4 bg-white border-t border-[#F2F2F7] flex gap-3 p-4 rounded-2xl">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Например: покажи беспроводные наушники до 5000₽..."
          className="flex-1 px-4 py-3 rounded-xl bg-[#F2F2F7] border border-transparent focus:bg-white focus:border-[#007AFF] outline-none text-sm"
          disabled={isLoading}
        />
        <button 
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