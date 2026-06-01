import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import ModerationPreviewModal from '../components/ModerationPreviewModal';
import ModerationActionModal from '../components/ModerationActionModal';
import { STORE_STATUS_ACTIONS } from '../constants/moderationActions';
import { apiEndpoints } from '../api/axios';

function StatusPill({ status }) {
  const map = {
    pending_moderation: 'bg-[#FF9500]/10 text-[#FF9500]',
    active: 'bg-[#34C759]/10 text-[#34C759]',
    limited: 'bg-[#FF9500]/10 text-[#FF9500]',
    blocked: 'bg-[#FF3B30]/10 text-[#FF3B30]',
    rejected: 'bg-[#FF3B30]/10 text-[#FF3B30]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${map[status] || 'bg-[#F2F2F7] text-text-secondary'}`}>
      {status || '—'}
    </span>
  );
}

export default function AdminModerationStores() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending_moderation');
  const [q, setQ] = useState('');
  const [previewStore, setPreviewStore] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['moderation', 'stores', { status, q }],
    queryFn: async () => {
      const res = await apiEndpoints.moderationListStores({ status, q: q || undefined, page_size: 50 });
      return res.data;
    },
  });

  const items = useMemo(() => (Array.isArray(data) ? data : (data?.results ?? [])), [data]);

  const patchStore = async (id, payload) => {
    await apiEndpoints.moderationPatchStore(id, payload);
    await qc.invalidateQueries({ queryKey: ['moderation', 'stores'] });
  };

  const setStoreStatus = async (id, next, reason = '') => {
    await apiEndpoints.moderationSetStoreStatus(id, { status: next, reason });
    await qc.invalidateQueries({ queryKey: ['moderation', 'stores'] });
  };

  const openStoreAction = (store, next) => {
    const config = STORE_STATUS_ACTIONS[next];
    if (!config) return;
    setPendingAction({ store, next, ...config });
  };

  const handleConfirmStoreAction = async (reason) => {
    if (!pendingAction) return;
    setActionSubmitting(true);
    try {
      await setStoreStatus(pendingAction.store.id, pendingAction.next, reason);
      setPendingAction(null);
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] overflow-hidden">
      <div className="p-5 border-b border-[#F2F2F7] flex flex-wrap items-center justify-between gap-3">
        <div className="font-bold text-lg">Очередь магазинов</div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#F2F2F7] rounded-xl px-3 py-2 text-sm outline-none"
          >
            <option value="pending_moderation">pending_moderation</option>
            <option value="active">active</option>
            <option value="limited">limited</option>
            <option value="blocked">blocked</option>
            <option value="rejected">rejected</option>
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по названию…"
            className="bg-[#F2F2F7] rounded-xl px-3 py-2 text-sm outline-none w-64 max-w-full"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 text-text-secondary">Загрузка…</div>
      ) : isError ? (
        <div className="p-6 text-[#FF3B30]">Ошибка: {error?.response?.data?.detail || 'не удалось загрузить'}</div>
      ) : items.length === 0 ? (
        <div className="p-6 text-text-secondary">Пусто.</div>
      ) : (
        <div className="divide-y divide-[#F2F2F7]">
          {items.map((s) => (
            <div key={s.id} className="p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPreviewStore(s)}
                    className="font-semibold truncate text-left text-[#007AFF] hover:underline max-w-full"
                    title="Показать описание и логотип"
                  >
                    {s.name}
                  </button>
                  <StatusPill status={s.status} />
                  {s.is_verified ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#34C759]/10 text-[#34C759]">
                      verified
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                  <span>id: <span className="font-medium text-text-primary">{s.id}</span></span>
                  <span className="text-[#E5E5EA]">•</span>
                  <span>владелец: <span className="font-medium text-text-primary">{s.owner_username}</span> (#{s.owner_id})</span>
                  <span className="text-[#E5E5EA]">•</span>
                  <span>rating: <span className="font-medium text-text-primary">{Number(s.rating ?? 0).toFixed(1)}</span></span>
                  {s.rating_manual !== null && typeof s.rating_manual !== 'undefined' ? (
                    <>
                      <span className="text-[#E5E5EA]">•</span>
                      <span>manual: <span className="font-medium text-text-primary">{Number(s.rating_manual).toFixed(1)}</span></span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <Button variant="secondary" onClick={() => patchStore(s.id, { is_verified: !s.is_verified })}>
                  {s.is_verified ? 'Снять verified' : 'Поставить verified'}
                </Button>
                <Button variant="secondary" onClick={() => setStoreStatus(s.id, 'active')}>
                  Активировать
                </Button>
                <Button variant="secondary" onClick={() => openStoreAction(s, 'limited')}>
                  На доработку
                </Button>
                <Button variant="secondary" onClick={() => openStoreAction(s, 'rejected')}>
                  Отклонить
                </Button>
                <Button variant="secondary" onClick={() => openStoreAction(s, 'blocked')}>
                  Блок
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModerationActionModal
        open={Boolean(pendingAction)}
        onClose={() => !actionSubmitting && setPendingAction(null)}
        title={pendingAction?.title}
        description={pendingAction?.description}
        entityName={pendingAction?.store?.name}
        entityLabel="Магазин"
        confirmLabel={pendingAction?.confirmLabel}
        confirmVariant={pendingAction?.confirmVariant}
        onConfirm={handleConfirmStoreAction}
        isSubmitting={actionSubmitting}
      />

      <ModerationPreviewModal
        open={Boolean(previewStore)}
        onClose={() => setPreviewStore(null)}
        title={previewStore?.name}
        description={previewStore?.description}
        imageUrl={previewStore?.logo}
        imageAlt={previewStore?.name}
      >
        {previewStore && (
          <div className="text-xs text-text-secondary flex flex-wrap gap-x-2 gap-y-1">
            <span>id: {previewStore.id}</span>
            <span className="text-[#E5E5EA]">•</span>
            <span>владелец: {previewStore.owner_username} (#{previewStore.owner_id})</span>
            <span className="text-[#E5E5EA]">•</span>
            <span>рейтинг: {Number(previewStore.rating ?? 0).toFixed(1)}</span>
          </div>
        )}
      </ModerationPreviewModal>
    </div>
  );
}

