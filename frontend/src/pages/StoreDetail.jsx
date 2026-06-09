import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import ProductCard from '../components/ui/ProductCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';

export default function StoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');
  const [showToast, setShowToast] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  
  // ✅ 1. Стейт для выбранного варианта сортировки
  const [sortOption, setSortOption] = useState('popularity');

  // Request store details.
  const { data: store, isLoading: storeLoading, error: storeError } = useQuery({
    queryKey: ['store', id],
    queryFn: () => apiEndpoints.getStore(id).then(res => res.data),
    enabled: !!id,
  });

  // Request current user for ownership checks.
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => apiEndpoints.me().then(res => res.data),
    enabled: !!token,
  });

  // Request products for this store.
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'store', id],
    queryFn: async () => {
      const response = await apiEndpoints.getProducts();
      return response.data.filter(product => product.store === parseInt(id) || product.store?.id === parseInt(id));
    },
    enabled: !!id && !storeError,
  });

  const { data: storeReviewsSummary, isLoading: isStoreReviewsLoading } = useQuery({
    queryKey: ['store', id, 'reviews-summary'],
    queryFn: () => apiEndpoints.getStoreReviewsSummary(id, { limit: 10 }).then((res) => res.data),
    enabled: Boolean(id) && isReviewsOpen,
    staleTime: 30_000,
  });

  const isOwner = store && currentUser ? store.owner_id === currentUser.id : false;

  // Format creation date label.
  const formatDate = (dateString) => {
    if (!dateString) return '2024';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' });
  };

  const storeRatingText = useMemo(() => {
    const raw = Number(store?.rating);
    return Number.isFinite(raw) ? raw.toFixed(1) : '0.0';
  }, [store?.rating]);

  // ✅ 2. Логика сортировки (useMemo предотвращает лишние пересчеты)
  const sortedProducts = useMemo(() => {
    if (!products) return [];
    // Создаём копию, чтобы не мутировать исходный кэш React Query
    const sorted = [...products];
    
    switch (sortOption) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      case 'cheapest':
        sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'expensive':
        sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating':
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'popularity':
      default:
        // Сортировка по продажам или количеству отзывов
        sorted.sort((a, b) => (b.total_sales || b.review_count || 0) - (a.total_sales || a.review_count || 0));
        break;
    }
    return sorted;
  }, [products, sortOption]);

  // Copy current page URL.
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  // Loading state.
  if (storeLoading || (token && userLoading)) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-[#E5E5EA] rounded-b-2xl"></div>
            <div className="h-32 bg-white rounded-2xl shadow-subtle max-w-4xl mx-auto"></div>
          </div>
          <p className="mt-6 text-text-secondary">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Not found or request error state.
  if (storeError || !store) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <EmptyState
          title="Магазин не найден"
          description="Возможно, магазин был удалён или перемещён"
          actionLabel="Вернуться на главную"
          icon="box"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] relative">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-down">
          <div className="bg-[#1C1C1E] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 border border-white/10">
            <div className="w-5 h-5 rounded-full bg-[#34C759] flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-medium whitespace-nowrap">Ссылка скопирована</span>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="w-full h-64 bg-gradient-to-br from-[#007AFF] to-[#5856D6] relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-[1440px] mx-auto px-6 py-4 relative z-10">
          <button
            onClick={() => navigate('/')}
            className="text-white/90 hover:text-white text-sm flex items-center gap-2 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            На главную
          </button>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 -mt-20 relative z-20 pb-12">
        {/* Store Info */}
        <div className="bg-white rounded-2xl shadow-card p-8 mb-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-[#F2F2F7] shadow-lg flex items-center justify-center text-4xl font-bold text-[#007AFF] border-4 border-white -mt-14 overflow-hidden flex-shrink-0">
            {store.logo ? (
              <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              store.name?.charAt(0).toUpperCase() || 'S'
            )}
          </div>
          <div className="flex-1 mt-4 md:mt-0">
            <h1 className="text-2xl font-bold mb-2">{store.name}</h1>
            <p className="text-text-secondary text-sm mb-3 max-w-2xl">
              {store.description || 'Описание магазина пока не добавлено'}
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              {store.is_verified ? (
                <Badge variant="success">Проверенный продавец</Badge>
              ) : null}
              <Badge variant="info">★ {storeRatingText}</Badge>
              <button
                type="button"
                onClick={() => setIsReviewsOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] transition text-xs text-text-secondary"
                title="Открыть отзывы магазина"
              >
                <span className="font-semibold text-text-primary">
                  {Number(store.review_count ?? 0)}
                </span>
                <span>отзывов</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <span className="text-xs text-text-secondary">
                {store.products_count || products?.length || 0} товаров
              </span>
              <span className="text-xs text-text-secondary">•</span>
              <span className="text-xs text-text-secondary">
                С {formatDate(store.created_at)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#007AFF]">{store.products_count || products?.length || 0}</div>
                <div className="text-xs text-text-secondary">товаров</div>
              </div>
              <div className="w-px h-10 bg-[#E5E5EA]"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#34C759]">{store.total_sales || 0}</div>
                <div className="text-xs text-text-secondary">продаж</div>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handleShare}
              className="flex items-center gap-2"
              title="Поделиться ссылкой"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Store reviews modal */}
        {isReviewsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <button
              type="button"
              className="absolute inset-0 bg-black/30"
              onClick={() => setIsReviewsOpen(false)}
              aria-label="Закрыть отзывы"
            />
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F2F7]">
                <div>
                  <div className="text-lg font-bold">Отзывы магазина</div>
                  <div className="text-sm text-text-secondary">
                    Всего: <span className="font-semibold text-text-primary">{storeReviewsSummary?.count ?? store.review_count ?? 0}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReviewsOpen(false)}
                  className="w-10 h-10 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] transition flex items-center justify-center text-text-secondary"
                  aria-label="Закрыть"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="max-h-[70vh] overflow-auto p-6">
                {isStoreReviewsLoading ? (
                  <div className="text-text-secondary">Загрузка отзывов…</div>
                ) : (storeReviewsSummary?.latest?.length || 0) === 0 ? (
                  <div className="text-text-secondary">Пока нет отзывов по товарам этого магазина.</div>
                ) : (
                  <div className="space-y-4">
                    {storeReviewsSummary.latest.map((r) => (
                      <div key={r.id} className="border border-[#F2F2F7] rounded-2xl p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">
                              {r.author_username || 'Покупатель'}
                            </div>
                            <div className="text-xs text-text-secondary mt-1">
                              Товар: <span className="font-medium text-text-primary">{r.product_name || `#${r.product}`}</span>
                            </div>
                          </div>
                          <div className="text-sm text-[#FF9500] font-semibold whitespace-nowrap">
                            ★ {(Number(r.rating) || 0).toFixed(1)}
                          </div>
                        </div>
                        {r.text && (
                          <div className="mt-3 text-sm text-text-secondary leading-relaxed">
                            {r.text}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            Товары магазина
            <span className="text-text-secondary font-normal text-base ml-2">
              ({sortedProducts?.length || 0})
            </span>
          </h2>
          {/* ✅ 3. Контролируемый select + обработчик onChange */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-[#E5E5EA] text-sm shadow-sm outline-none focus:ring-2 focus:ring-[#007AFF]/20 transition"
          >
            <option value="popularity">По популярности</option>
            <option value="newest">Сначала новые</option>
            <option value="cheapest">Сначала дешёвые</option>
            <option value="expensive">Сначала дорогие</option>
            <option value="rating">По рейтингу</option>
          </select>
        </div>

        {/* Product Grid */}
        {productsLoading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#007AFF] border-t-transparent"></div>
            <p className="mt-4 text-text-secondary">Загрузка товаров...</p>
          </div>
        ) : sortedProducts?.length === 0 ? (
          <EmptyState
            title="В магазине пока нет товаров"
            description="Загляните позже — продавец обязательно добавит что-то интересное!"
            icon="box"
            actionLabel="Перейти в каталог"
          />
        ) : (
          <div className="grid grid-cols-4 gap-6">
            {/* ✅ 4. Рендерим отсортированный массив */}
            {sortedProducts?.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                isOwner={isOwner}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}