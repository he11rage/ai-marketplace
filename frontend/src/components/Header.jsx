import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../hooks/useCart';
import { apiEndpoints } from '../api/axios';
import { isAdmin, isSeller } from '../utils/roles';

const SEARCH_DEBOUNCE_MS = 1000;

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { count } = useCart();
  const token = localStorage.getItem('access_token');
  const searchFromUrl = new URLSearchParams(location.search).get('search') || '';
  const [searchTerm, setSearchTerm] = useState(searchFromUrl);
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => apiEndpoints.me().then(res => res.data),
    enabled: !!token,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    setSearchTerm(searchFromUrl);
  }, [searchFromUrl]);

  const runSearch = useCallback((value) => {
    const trimmedValue = value.trim();

    if (trimmedValue) {
      navigate(`/catalog?search=${encodeURIComponent(trimmedValue)}`);
      return;
    }

    if (location.pathname === '/catalog' && searchFromUrl) {
      navigate('/catalog');
    }
  }, [location.pathname, navigate, searchFromUrl]);

  useEffect(() => {
    if (searchTerm.trim() === searchFromUrl) {
      return undefined;
    }

    const searchTimeout = setTimeout(() => {
      runSearch(searchTerm);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(searchTimeout);
  }, [runSearch, searchTerm, searchFromUrl]);

  return (
    <header className="bg-white border-b border-[#E5E5EA] sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white font-bold text-sm">AI</div>
          <span className="font-bold text-lg hidden lg:block">MarketFlow</span>
        </div>

        {/* Search and chat shortcut */}
        <div className="flex-1 relative">
          <div className="relative group">
            <input
              type="text"
              placeholder="Ищите товары, бренды или задайте вопрос AI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  runSearch(searchTerm);
                }
              }}
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

        {/* Right-side actions */}
        <div className="flex items-center gap-3">
          {isSeller(user) && (
            <button
              onClick={() => navigate('/seller')}
              title="Кабинет продавца"
              aria-label="Кабинет продавца"
              className="w-10 h-10 rounded-full bg-[#34C759]/10 flex items-center justify-center hover:bg-[#34C759]/20 transition text-[#34C759]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72L4.5 3.345M16.5 6.75h.008v.008H16.5V6.75Z" />
              </svg>
            </button>
          )}

          {isAdmin(user) && (
            <button
              onClick={() => navigate('/admin-panel')}
              title="Админ-панель"
              aria-label="Админ-панель"
              className="w-10 h-10 rounded-full bg-[#007AFF]/10 flex items-center justify-center hover:bg-[#007AFF]/20 transition text-[#007AFF]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.305-.209-2.562-.598-3.75A11.959 11.959 0 0 1 12 2.714Z" />
              </svg>
            </button>
          )}

          <button onClick={() => navigate(token ? '/account' : '/login')} className="w-10 h-10 rounded-full bg-[#F2F2F7] flex items-center justify-center hover:bg-[#E5E5EA] transition text-text-secondary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
          </button>
          <button onClick={() => navigate('/wishlist')} className="w-10 h-10 rounded-full bg-[#F2F2F7] flex items-center justify-center hover:bg-[#E5E5EA] transition text-text-secondary">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>
          </button>

          {/* Cart with live item counter */}
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
