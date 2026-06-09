import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/ui/Button';
import { apiEndpoints } from '../api/axios';

// Забираем токен из хранилища для авторизованных запросов
const token = localStorage.getItem('access_token');
const headers = {
  Authorization: token ? `Bearer ${token}` : ''
};

function normalizeCountResponse(data) {
  if (!data) return null;
  if (typeof data.count === 'number') return data.count;
  if (Array.isArray(data)) return data.length;
  return null;
}

function StatCard({ title, value, onClick, tone = 'default' }) {
  const toneClasses = {
    default: 'bg-white border-[#E5E5EA]',
    info: 'bg-[#007AFF]/5 border-[#007AFF]/20',
    warning: 'bg-[#FF9500]/5 border-[#FF9500]/25',
    danger: 'bg-[#FF3B30]/5 border-[#FF3B30]/25',
    success: 'bg-[#34C759]/5 border-[#34C759]/25',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border p-5 shadow-subtle hover:shadow-card transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 ${toneClasses[tone] ?? toneClasses.default}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-text-secondary mb-1">{title}</div>
          <div className="text-3xl font-bold leading-tight">{value}</div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-white/70 border border-[#E5E5EA] flex items-center justify-center text-text-secondary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.5 4.5 21 12l-7.5 7.5M3 12h18" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// --- КОМПОНЕНТ МОДАЛЬНОГО ОКНА АНАЛИТИКИ ---
function AdminStoreAnalyticsModal({ storeId, onClose }) {
  const { data: overview, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['admin-store-overview', storeId],
    queryFn: () => axios.get(`/api/moderation/stores/${storeId}/analytics/overview/`, { headers }).then(res => res.data)
  });

  const { data: productsData } = useQuery({
    queryKey: ['admin-store-products', storeId],
    queryFn: () => axios.get(`/api/moderation/stores/${storeId}/analytics/products/`, { headers }).then(res => res.data)
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['admin-store-low-stock', storeId],
    queryFn: () => axios.get(`/api/moderation/stores/${storeId}/analytics/low-stock/`, { headers }).then(res => res.data)
  });

  if (isOverviewLoading) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#F2F2F7] rounded-3xl w-full max-w-5xl max-h-[90vh] shadow-2xl relative flex flex-col animate-in fade-in zoom-in-95 duration-200 p-20 text-center text-gray-400 font-medium text-sm">
          Загрузка бизнес-аналитики магазина...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-[#F2F2F7] rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Хедер модалки */}
        <div className="bg-white rounded-t-3xl p-6 shadow-sm border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              Аналитика магазина: <span className="text-[#007AFF]">{overview?.store_name || overview?.name || `Магазин #${storeId}`}</span>
            </h1>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400 font-medium">
              <span>Режим суперадминистратора MarketFlow</span>
              <span className="text-gray-300">•</span>
              <span>Всего товаров на платформе: <span className="text-gray-700 font-bold">{overview?.catalog_summary?.total || productsData?.catalog_summary?.total || 0} шт.</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] transition flex items-center justify-center text-text-secondary cursor-pointer ml-2" 
              aria-label="Закрыть"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Тело модалки со скроллом */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Ряд из 4-х верхних карточек метрик */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100/40">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Выручка (всего)</span>
              <div className="text-2xl font-black text-gray-900 mt-1">{overview?.total_revenue || 0} ₽</div>
              <div className="text-[11px] text-[#34C759] font-semibold mt-1">
                За неделю: +{overview?.revenue_week_growth_percent ? `${overview.revenue_week_growth_percent}%` : '0%'}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100/40">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">За эту неделю</span>
              <div className="text-2xl font-black text-gray-900 mt-1">{overview?.revenue_this_week || 0} ₽</div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100/40">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Заказов всего</span>
              <div className="text-2xl font-black text-gray-900 mt-1">{overview?.orders_total || 0}</div>
              <div className="text-[11px] text-gray-400 font-semibold mt-1">За неделю: 0</div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100/40">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Продано единиц</span>
              <div className="text-2xl font-black text-gray-900 mt-1">{overview?.units_sold || 0}</div>
            </div>
          </div>

          {/* Два нижних больших блока аналитики */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Секция: Товары по выручке */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/40 min-h-[320px] flex flex-col">
              <h3 className="font-bold text-gray-800 text-sm mb-1">Товары по выручке</h3>
              <p className="text-xs text-gray-400 mb-4">Топ продаж среди подтверждённых заказов</p>
              {productsData?.top_by_revenue && productsData.top_by_revenue.length > 0 ? (
                <div className="space-y-2 flex-grow overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                  {productsData.top_by_revenue.map((item, index) => (
                    <div key={item.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">#{index + 1}</span>
                        <span className="text-sm font-medium text-gray-800 truncate" title={item.name || item.product_name}>
                          {item.name || item.product_name || 'Без названия'}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 flex-shrink-0 ml-2">
                        {item.revenue || item.total_revenue || 0} ₽
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center my-auto text-center py-6">
                  <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="w-10 h-10 text-gray-300 mb-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <span className="text-xs font-bold text-gray-800">Продаж пока нет</span>
                  <span className="text-[11px] text-gray-400 mt-1 max-w-xs leading-relaxed">
                    Когда появятся оплаченные заказы, здесь отобразится рейтинг товаров.
                  </span>
                </div>
              )}
            </div>

            {/* Секция: Низкий остаток */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/40 min-h-[320px] flex flex-col">
              <h3 className="font-bold text-gray-800 text-sm mb-1">Низкий остаток</h3>
              <p className="text-xs text-gray-400 mb-4">Меньше 5 шт. на складе</p>
              {lowStockData && (lowStockData.length > 0 || (lowStockData.items && lowStockData.items.length > 0)) ? (
                <div className="space-y-2 flex-grow overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                  {(lowStockData.items || lowStockData).map((item, index) => (
                    <div key={item.id || index} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-red-400 w-5 flex-shrink-0">!</span>
                        <span className="text-sm font-medium text-gray-800 truncate" title={item.name || item.product_name}>
                          {item.name || item.product_name || 'Без названия'}
                        </span>
              </div>
                      <span className="text-xs font-bold text-red-600 flex-shrink-0 ml-2 bg-red-100 px-2 py-1 rounded-md">
                        Остаток: {item.stock || item.quantity || 0} шт.
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center my-auto text-center py-6">
                  <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-10 h-10 text-[#34C759] mb-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-bold text-gray-800">Всё в порядке</span>
                  <span className="text-[11px] text-gray-400 mt-1 max-w-xs leading-relaxed">
                    Нет товаров с критически низким остатком на складе.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ОСНОВНОЙ КОМПОНЕНТ ---
export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeStore, setActiveStore] = useState(null);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [storeSaveError, setStoreSaveError] = useState('');
  const [storeForm, setStoreForm] = useState({ is_verified: false, rating_manual: '' });
  
  // Стейт для модального окна аналитики
  const [analyticsStoreId, setAnalyticsStoreId] = useState(null);

  const {
    data: storesData,
    isLoading: storesLoading,
    isError: storesError,
  } = useQuery({
    queryKey: ['admin-panel', 'stores'],
    queryFn: async () => {
      const res = await apiEndpoints.moderationListStores();
      return res.data;
    },
  });

  const storesList = useMemo(() => (Array.isArray(storesData) ? storesData : (storesData?.results ?? [])), [storesData]);

  const {
    data: reportsData,
    isLoading: reportsLoading,
    isError: reportsError,
  } = useQuery({
    queryKey: ['admin-panel', 'reports-open-count'],
    queryFn: async () => {
      const res = await apiEndpoints.moderationListReports({ status: 'open' });
      return res.data;
    },
  });

  const {
    data: pendingProductsData,
    isLoading: pendingProductsLoading,
    isError: pendingProductsError,
  } = useQuery({
    queryKey: ['admin-panel', 'products-pending-count'],
    queryFn: async () => {
      const res = await apiEndpoints.moderationListProducts({ status: 'pending_moderation' });
      return res.data;
    },
  });

  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
  } = useQuery({
    queryKey: ['admin-panel', 'users-count'],
    queryFn: async () => {
      const res = await apiEndpoints.moderationListUsers();
      return res.data;
    },
  });

  const {
    data: pendingCategoriesData,
    isLoading: pendingCategoriesLoading,
    isError: pendingCategoriesError,
  } = useQuery({
    queryKey: ['admin-panel', 'categories-pending-count'],
    queryFn: async () => {
      const res = await apiEndpoints.moderationListCategories({ verified: 'false' });
      return res.data;
    },
  });

  const storesCount = useMemo(() => normalizeCountResponse(storesData), [storesData]);
  const reportsCount = useMemo(() => normalizeCountResponse(reportsData), [reportsData]);
  const pendingProductsCount = useMemo(() => normalizeCountResponse(pendingProductsData), [pendingProductsData]);
  const pendingCategoriesCount = useMemo(() => normalizeCountResponse(pendingCategoriesData), [pendingCategoriesData]);
  const usersCount = useMemo(() => normalizeCountResponse(usersData), [usersData]);

  const unresolvedValue = '—';
  const loadingValue = '…';

  const openStoreEditor = (store) => {
    setStoreSaveError('');
    setActiveStore(store);
    setStoreForm({
      is_verified: Boolean(store?.is_verified),
      rating_manual: store?.rating_manual === null || typeof store?.rating_manual === 'undefined'
        ? ''
        : String(store.rating_manual),
    });
  };

  const closeStoreEditor = () => {
    setActiveStore(null);
    setStoreSaveError('');
    setIsSavingStore(false);
  };

  const handleSaveStore = async () => {
    if (!activeStore) return;
    setStoreSaveError('');
    setIsSavingStore(true);
    try {
      const raw = String(storeForm.rating_manual ?? '').trim();
      const ratingManualValue = raw === '' ? null : Number(raw);
      if (ratingManualValue !== null && (!Number.isFinite(ratingManualValue) || ratingManualValue < 0 || ratingManualValue > 5)) {
        setStoreSaveError('Рейтинг (ручной) должен быть числом от 0 до 5 или пустым.');
        return;
      }
      await apiEndpoints.updateStore(activeStore.id, {
        is_verified: Boolean(storeForm.is_verified),
        rating_manual: ratingManualValue === null ? null : Math.round(ratingManualValue * 10) / 10,
      });
      window.location.reload();
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Не удалось сохранить магазин.';
      setStoreSaveError(msg);
    } finally {
      setIsSavingStore(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-10">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <div className="inline-flex items-center rounded-full bg-[#007AFF]/10 px-3 py-1 text-xs font-semibold text-[#007AFF] mb-4">
            Admin
          </div>
          <h1 className="text-3xl font-bold mb-2">Админ-панель</h1>
          <p className="text-text-secondary max-w-2xl">
            Дашборд для быстрой проверки очередей и проблемных мест.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/')}>
            На главную
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="Товары на проверке"
          value={pendingProductsLoading ? loadingValue : (pendingProductsError ? unresolvedValue : (pendingProductsCount ?? unresolvedValue))}
          tone="warning"
          onClick={() => navigate('/admin/moderation/products')}
        />
        <StatCard
          title="Категории на проверке"
          value={pendingCategoriesLoading ? loadingValue : (pendingCategoriesError ? unresolvedValue : (pendingCategoriesCount ?? unresolvedValue))}
          tone="warning"
          onClick={() => navigate('/admin/moderation/categories')}
        />
        <StatCard
          title="Жалобы"
          value={reportsLoading ? loadingValue : (reportsError ? unresolvedValue : (reportsCount ?? unresolvedValue))}
          tone="danger"
          onClick={() => navigate('/admin/moderation/reports')}
        />
        <StatCard
          title="Магазины"
          value={storesLoading ? loadingValue : (storesError ? unresolvedValue : (storesCount ?? unresolvedValue))}
          tone="info"
          onClick={() => navigate('/admin/moderation/stores')}
        />
        <StatCard
          title="Пользователи"
          value={usersLoading ? loadingValue : (usersError ? unresolvedValue : (usersCount ?? unresolvedValue))}
          tone="default"
          onClick={() => navigate('/admin/moderation/users')}
        />
        <StatCard
          title="AI-ошибки"
          value={unresolvedValue}
          tone="default"
          onClick={() => navigate('/admin/moderation/ai-history')}
        />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Бизнес-статистика всех магазинов</h2>
            <p className="text-xs text-gray-400 mt-0.5">Мониторинг выручки, рейтинга и управление параметрами продавцов на платформе</p>
          </div>
          <div className="text-xs text-gray-400 font-medium bg-gray-100 px-3 py-1.5 rounded-xl">
            Всего магазинов: <span className="text-gray-800 font-bold">{storesList.length}</span>
          </div>
        </div>

        {storesLoading ? (
          <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] p-8 text-center text-sm text-gray-400">
            Загрузка базы данных магазинов…
          </div>
        ) : storesError ? (
          <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] p-8 text-center text-sm text-[#FF3B30] bg-red-50/50">
            Не удалось загрузить список магазинов. Проверьте соединение с API.
          </div>
        ) : storesList.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] p-8 text-center text-sm text-gray-400">
            На платформе пока нет зарегистрированных магазинов.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#F2F2F7] text-xs font-bold text-gray-400 uppercase bg-gray-50/40">
                    <th className="py-3 px-6">ID / Владелец</th>
                    <th className="py-3 px-6">Название магазина</th>
                    <th className="py-3 px-6 text-center">Рейтинг</th>
                    <th className="py-3 px-6 text-center">Отзывы</th>
                    <th className="py-3 px-6 text-center">Верификация</th>
                    <th className="py-3 px-6 text-right">Действия админа</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F2F7] text-sm text-gray-700">
                  {storesList.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/30 transition group">
                      <td className="py-3 px-6 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-gray-400">#{s.id}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          owner: <span className="font-medium text-gray-600">{s.owner_username || `ID: ${s.owner_id}`}</span>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <div className="font-bold text-gray-900">{s.name}</div>
                      </td>
                      <td className="py-3 px-6 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 font-bold text-xs">
                            ★ {Number(s.rating ?? 0).toFixed(1)}
                          </span>
                          {s.rating_manual !== null && typeof s.rating_manual !== 'undefined' && (
                            <span className="text-[10px] font-medium text-gray-400" title="Ручной рейтинг">
                              (man: {Number(s.rating_manual).toFixed(1)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-6 text-center font-semibold text-gray-500">
                        {Number(s.review_count ?? 0)}
                      </td>
                      <td className="py-3 px-6 text-center">
                        {s.is_verified ? (
                          <span className="px-2 py-0.5 rounded-md bg-[#34C759]/10 text-[#34C759] text-[10px] font-bold uppercase tracking-wide">
                            Verified
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => setAnalyticsStoreId(s.id)}
                            className="px-2.5 py-1.5 bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
                          >
                            Статистика
                          </button>
                          <button
                            onClick={() => openStoreEditor(s)}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Настройка
                          </button>
                          <a
                            href={`/store/${s.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-800 text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Витрина ↗
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {activeStore && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/30 backdrop-blur-xs"
            onClick={closeStoreEditor}
            aria-label="Закрыть"
          />
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden mt-20 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F2F7]">
              <div>
                <div className="text-lg font-bold text-gray-900">Настройка параметров продавца</div>
                <div className="text-sm text-gray-400 truncate mt-0.5">
                  {activeStore.name} (id: {activeStore.id})
                </div>
              </div>
              <button
                type="button"
                onClick={closeStoreEditor}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] transition flex items-center justify-center text-text-secondary cursor-pointer"
                aria-label="Закрыть"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              {storeSaveError ? (
                <div className="text-sm font-semibold text-[#FF3B30] bg-[#FF3B30]/5 px-3 py-2 rounded-lg">{storeSaveError}</div>
              ) : null}
              <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#F2F2F7] cursor-pointer">
                <div>
                  <div className="font-semibold text-gray-800 text-sm">Проверенный продавец</div>
                  <div className="text-xs text-gray-400 mt-0.5 max-w-xs">
                    Показывается на витрине в карточке продавца и на странице магазина.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(storeForm.is_verified)}
                  onChange={(e) => setStoreForm((p) => ({ ...p, is_verified: e.target.checked }))}
                  className="w-5 h-5 accent-[#007AFF] cursor-pointer"
                />
              </label>
              <label className="block">
                <div className="text-sm font-semibold text-gray-700 mb-2">Рейтинг (ручной)</div>
                <input
                  value={storeForm.rating_manual}
                  onChange={(e) => setStoreForm((p) => ({ ...p, rating_manual: e.target.value }))}
                  placeholder="Пусто = авто-рейтинг из отзывов"
                  className="w-full bg-[#F2F2F7] border border-transparent focus:bg-white focus:border-[#007AFF] transition rounded-xl px-4 py-3 text-sm outline-none font-medium text-gray-800"
                  inputMode="decimal"
                />
                <div className="mt-2 text-xs text-gray-400 font-medium">
                  Диапазон от 0 до 5.0. Если оставить поле пустым — система автоматически рассчитает рейтинг на основе отзывов покупателей.
                </div>
              </label>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-50">
                <Button variant="secondary" onClick={closeStoreEditor} disabled={isSavingStore}>
                  Отмена
                </Button>
                <Button onClick={handleSaveStore} disabled={isSavingStore}>
                  {isSavingStore ? 'Сохранение…' : 'Сохранить параметры'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Рендеринг модального окна аналитики */}
      {analyticsStoreId && (
        <AdminStoreAnalyticsModal 
          storeId={analyticsStoreId} 
          onClose={() => setAnalyticsStoreId(null)} 
        />
      )}
    </div>
  );
}