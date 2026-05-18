import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart'; // Импортируем хук

export default function Header() {
  const navigate = useNavigate();
  const { count } = useCart(); // Достаем количество
  const token = localStorage.getItem('access_token');

  return (
    <header className="bg-white border-b border-[#E5E5EA] sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center gap-6">
        {/* Лого */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white font-bold text-sm">AI</div>
          <span className="font-bold text-lg hidden lg:block">MarketFlow</span>
        </div>

        {/* Поиск + AI */}
        <div className="flex-1 relative">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Ищите товары, бренды или задайте вопрос AI..." 
              className="w-full pl-5 pr-12 py-3 rounded-xl bg-[#F2F2F7] border-2 border-transparent focus:bg-white focus:border-[#007AFF] transition text-sm outline-none"
            />
            <button 
              onClick={() => navigate('/chat')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white hover:scale-105 transition shadow-primary"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Иконки справа */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(token ? '/account' : '/login')} className="w-10 h-10 rounded-full bg-[#F2F2F7] flex items-center justify-center hover:bg-[#E5E5EA] transition text-text-secondary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
          </button>
          <button onClick={() => navigate('/wishlist')} className="w-10 h-10 rounded-full bg-[#F2F2F7] flex items-center justify-center hover:bg-[#E5E5EA] transition text-text-secondary">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>
          </button>
          
          {/* КОРЗИНА С ЖИВЫМ СЧЕТЧИКОМ */}
          <button onClick={() => navigate('/cart')} className="w-10 h-10 rounded-full bg-[#F2F2F7] flex items-center justify-center hover:bg-[#E5E5EA] transition text-text-secondary relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>
            
            {count > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}