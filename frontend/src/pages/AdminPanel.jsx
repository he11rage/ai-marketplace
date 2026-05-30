import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { apiEndpoints } from '../api/axios';

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

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeStore, setActiveStore] = useState(null);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [storeSaveError, setStoreSaveError] = useState('');
  const [storeForm, setStoreForm] = useState({ is_verified: false, rating_manual: '' });

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

      // Refresh stores list/count.
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
          value={
            pendingProductsLoading
              ? loadingValue
              : (pendingProductsError ? unresolvedValue : (pendingProductsCount ?? unresolvedValue))
          }
          tone="warning"
          onClick={() => navigate('/admin/moderation/products')}
        />

        <StatCard
          title="Категории на проверке"
          value={
            pendingCategoriesLoading
              ? loadingValue
              : (pendingCategoriesError ? unresolvedValue : (pendingCategoriesCount ?? unresolvedValue))
          }
          tone="warning"
          onClick={() => navigate('/admin/moderation/categories')}
        />

        <StatCard
          title="Жалобы"
          value={
            reportsLoading
              ? loadingValue
              : (reportsError ? unresolvedValue : (reportsCount ?? unresolvedValue))
          }
          tone="danger"
          onClick={() => navigate('/admin/moderation/reports')}
        />

        <StatCard
          title="Магазины"
          value={
            storesLoading
              ? loadingValue
              : (storesError ? unresolvedValue : (storesCount ?? unresolvedValue))
          }
          tone="info"
          onClick={() => navigate('/admin/moderation/stores')}
        />

        <StatCard
          title="Пользователи"
          value={
            usersLoading
              ? loadingValue
              : (usersError ? unresolvedValue : (usersCount ?? unresolvedValue))
          }
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
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold">Магазины</h2>
          <div className="text-sm text-text-secondary">
            Управление полями продавца: <span className="font-semibold text-text-primary">Проверенный</span> и <span className="font-semibold text-text-primary">Рейтинг (ручной)</span>
          </div>
        </div>

        {storesLoading ? (
          <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] p-6 text-text-secondary">
            Загрузка магазинов…
          </div>
        ) : storesError ? (
          <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] p-6 text-[#FF3B30]">
            Не удалось загрузить список магазинов.
          </div>
        ) : storesList.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] p-6 text-text-secondary">
            Пока нет магазинов.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] overflow-hidden">
            <div className="divide-y divide-[#F2F2F7]">
              {storesList.map((s) => (
                <div key={s.id} className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.name}</div>
                    <div className="mt-1 text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                      <span>id: <span className="font-medium text-text-primary">{s.id}</span></span>
                      <span className="text-[#E5E5EA]">•</span>
                      <span>Рейтинг: <span className="font-medium text-text-primary">{Number(s.rating ?? 0).toFixed(1)}</span></span>
                      <span className="text-[#E5E5EA]">•</span>
                      <span>Отзывы: <span className="font-medium text-text-primary">{Number(s.review_count ?? 0)}</span></span>
                      {s.is_verified ? (
                        <>
                          <span className="text-[#E5E5EA]">•</span>
                          <span className="font-semibold text-[#34C759]">Проверенный</span>
                        </>
                      ) : null}
                      {s.rating_manual !== null && typeof s.rating_manual !== 'undefined' ? (
                        <>
                          <span className="text-[#E5E5EA]">•</span>
                          <span>Ручной: <span className="font-medium text-text-primary">{Number(s.rating_manual).toFixed(1)}</span></span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Button variant="secondary" onClick={() => openStoreEditor(s)}>
                      Открыть
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {activeStore ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={closeStoreEditor}
            aria-label="Закрыть"
          />
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F2F7]">
              <div>
                <div className="text-lg font-bold">Магазин</div>
                <div className="text-sm text-text-secondary truncate">
                  {activeStore.name} (id: {activeStore.id})
                </div>
              </div>
              <button
                type="button"
                onClick={closeStoreEditor}
                className="w-10 h-10 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] transition flex items-center justify-center text-text-secondary"
                aria-label="Закрыть"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {storeSaveError ? (
                <div className="text-sm text-[#FF3B30]">{storeSaveError}</div>
              ) : null}

              <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#F2F2F7]">
                <div>
                  <div className="font-semibold">Проверенный продавец</div>
                  <div className="text-xs text-text-secondary">
                    Показывается на витрине в карточке продавца и на странице магазина.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(storeForm.is_verified)}
                  onChange={(e) => setStoreForm((p) => ({ ...p, is_verified: e.target.checked }))}
                  className="w-5 h-5 accent-[#007AFF]"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-text-secondary mb-2">Рейтинг (ручной)</div>
                <input
                  value={storeForm.rating_manual}
                  onChange={(e) => setStoreForm((p) => ({ ...p, rating_manual: e.target.value }))}
                  placeholder="Пусто = авто-рейтинг из отзывов"
                  className="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 outline-none"
                  inputMode="decimal"
                />
                <div className="mt-2 text-xs text-text-secondary">
                  Диапазон 0..5.0. Если пусто — используется авто‑рейтинг магазина.
                </div>
              </label>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={closeStoreEditor} disabled={isSavingStore}>
                  Отмена
                </Button>
                <Button onClick={handleSaveStore} disabled={isSavingStore}>
                  {isSavingStore ? 'Сохранение…' : 'Сохранить'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

