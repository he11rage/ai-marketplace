import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function AIChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { id: 1, text: "👋 Привет! Я ваш AI-помощник. Что ищем сегодня?", sender: 'ai' }
  ]);
  const [inputValue, setInputValue] = useState('');

  // Данные для сайдбара (как в макете)
  const suggestedProducts = [
    { id: 1, name: 'SoundCore Q30', price: 59, oldPrice: 79, rating: '4.5' },
    { id: 2, name: 'Anker Q20', price: 49, rating: '4.2' },
    { id: 3, name: 'JBL Tune 510', price: 35, rating: '4.0' },
  ];

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newUserMsg = { id: Date.now(), text: inputValue, sender: 'user' };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');

    // Имитация ответа AI через секунду
    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { 
          id: Date.now() + 1, 
          text: "Отличный выбор! Я нашёл 5 вариантов. Вот лучшие из них:", 
          sender: 'ai' 
        }
      ]);
    }, 1000);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 h-[calc(100vh-120px)] flex gap-6">
      {/* Левая часть: Чат */}
      <div className="flex-1 bg-white rounded-2xl shadow-subtle flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#F2F2F7] flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-text-secondary hover:text-text-primary">
            ← На главную
          </button>
          <h1 className="text-xl font-bold">AI Ассистент</h1>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#FAFAFA]">
          {messages.map(msg => (
            <div key={msg.id} className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
              msg.sender === 'user' 
                ? 'ml-auto bg-[#007AFF] text-white rounded-2xl rounded-tr-none' 
                : 'mr-auto bg-[#F2F2F7] text-text-primary rounded-2xl rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-[#F2F2F7] flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Например: покажи беспроводные наушники до $100..."
            className="flex-1 px-4 py-3 rounded-xl bg-[#F2F2F7] border border-transparent focus:bg-white focus:border-[#007AFF] outline-none text-sm"
          />
          <button 
            onClick={handleSend}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white hover:opacity-90 transition"
          >
            ➤
          </button>
        </div>
      </div>

      {/* Правая часть: Suggested Products */}
      <div className="w-80 bg-white rounded-2xl shadow-subtle p-5 overflow-y-auto h-fit sticky top-20">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-text-secondary mb-4">Рекомендации</h3>
        <div className="space-y-3">
          {suggestedProducts.map(item => (
            <div key={item.id} className="bg-[#F5F5F7] rounded-xl p-3 hover:bg-[#E5E5EA] transition cursor-pointer group">
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#f0f4ff] to-[#e8f0ff] flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1 truncate">{item.name}</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[#007AFF] font-bold text-sm">${item.price}</span>
                    {item.oldPrice && <span className="text-xs text-text-secondary line-through">${item.oldPrice}</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[#FF9500] text-xs">★★★★★</span>
                    <span className="text-xs text-text-secondary">{item.rating}</span>
                  </div>
                </div>
              </div>
              <Button size="sm" className="w-full mt-3 opacity-0 group-hover:opacity-100 transition">В корзину</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}