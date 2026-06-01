import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import ModerationPreviewModal from '../components/ModerationPreviewModal';
import CategoryApprovalRequiredModal from '../components/CategoryApprovalRequiredModal';
import ModerationActionModal from '../components/ModerationActionModal';
import { PRODUCT_STATUS_ACTIONS } from '../constants/moderationActions';
import { apiEndpoints } from '../api/axios';

function StatusPill({ status }) {
  const map = {
    draft: 'bg-[#8E8E93]/10 text-[#8E8E93]',
    pending_moderation: 'bg-[#FF9500]/10 text-[#FF9500]',
    active: 'bg-[#34C759]/10 text-[#34C759]',
    rejected: 'bg-[#FF3B30]/10 text-[#FF3B30]',
    blocked: 'bg-[#FF3B30]/10 text-[#FF3B30]',
    archived: 'bg-[#8E8E93]/10 text-[#8E8E93]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${map[status] || 'bg-[#F2F2F7] text-text-secondary'}`}>
      {status || '—'}
    </span>
  );
}

export default function AdminModerationProducts() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending_moderation');
  const [q, setQ] = useState('');
  const [previewProduct, setPreviewProduct] = useState(null);
  const [categoryBlockProduct, setCategoryBlockProduct] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['moderation', 'products', { status, q }],
    queryFn: async () => {
      const res = await apiEndpoints.moderationListProducts({ status, q: q || undefined, page_size: 50 });
      return res.data;
    },
  });

  const items = useMemo(() => (Array.isArray(data) ? data : (data?.results ?? [])), [data]);

  const setProductStatus = async (id, next, reason = '') => {
    await apiEndpoints.moderationSetProductStatus(id, { status: next, reason });
    await qc.invalidateQueries({ queryKey: ['moderation', 'products'] });
  };

  const openProductAction = (product, next) => {
    const config = PRODUCT_STATUS_ACTIONS[next];
    if (!config) return;
    setPendingAction({ product, next, ...config });
  };

  const handleConfirmProductAction = async (reason) => {
    if (!pendingAction) return;
    setActionSubmitting(true);
    try {
      await setProductStatus(pendingAction.product.id, pendingAction.next, reason);
      setPendingAction(null);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleApprove = (product) => {
    if (product.category_needs_verification) {
      setCategoryBlockProduct(product);
      return;
    }
    setProductStatus(product.id, 'active');
  };

  return (
    <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] overflow-hidden">
      <div className="p-5 border-b border-[#F2F2F7] flex flex-wrap items-center justify-between gap-3">
        <div className="font-bold text-lg">Очередь товаров</div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#F2F2F7] rounded-xl px-3 py-2 text-sm outline-none"
          >
            <option value="pending_moderation">pending_moderation</option>
            <option value="active">active</option>
            <option value="rejected">rejected</option>
            <option value="blocked">blocked</option>
            <option value="draft">draft</option>
            <option value="archived">archived</option>
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
          {items.map((p) => (
            <div key={p.id} className="p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPreviewProduct(p)}
                    className="font-semibold truncate text-left text-[#007AFF] hover:underline max-w-full"
                    title="Показать описание и фото"
                  >
                    {p.name}
                  </button>
                  <StatusPill status={p.status} />
                </div>
                <div className="mt-2 text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                  <span>id: <span className="font-medium text-text-primary">{p.id}</span></span>
                  <span className="text-[#E5E5EA]">•</span>
                  <span>магазин: <span className="font-medium text-text-primary">{p.store_name}</span> (#{p.store_id})</span>
                  <span className="text-[#E5E5EA]">•</span>
                  <span>продавец: <span className="font-medium text-text-primary">{p.owner_username}</span> (#{p.owner_id})</span>
                  {p.category_name && (
                    <>
                      <span className="text-[#E5E5EA]">•</span>
                      <span>категория: <span className="font-medium text-text-primary">{p.category_name}</span></span>
                    </>
                  )}
                </div>
                {p.category_needs_verification && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#FF9500]/10 text-[#FF9500]">
                      Кастомная категория — требует проверки
                    </span>
                    <Link to="/admin/moderation/categories" className="text-sm text-[#007AFF] hover:underline">
                      Открыть очередь категорий
                    </Link>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="secondary" onClick={() => handleApprove(p)}>
                  Принять
                </Button>
                <Button variant="secondary" onClick={() => openProductAction(p, 'draft')}>
                  На доработку
                </Button>
                <Button variant="secondary" onClick={() => openProductAction(p, 'rejected')}>
                  Отклонить
                </Button>
                <Button variant="secondary" onClick={() => openProductAction(p, 'blocked')}>
                  Блок
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryApprovalRequiredModal
        open={Boolean(categoryBlockProduct)}
        onClose={() => setCategoryBlockProduct(null)}
        categoryName={categoryBlockProduct?.category_name}
      />

      <ModerationActionModal
        open={Boolean(pendingAction)}
        onClose={() => !actionSubmitting && setPendingAction(null)}
        title={pendingAction?.title}
        description={pendingAction?.description}
        entityName={pendingAction?.product?.name}
        entityLabel="Товар"
        confirmLabel={pendingAction?.confirmLabel}
        confirmVariant={pendingAction?.confirmVariant}
        onConfirm={handleConfirmProductAction}
        isSubmitting={actionSubmitting}
      />

      <ModerationPreviewModal
        open={Boolean(previewProduct)}
        onClose={() => setPreviewProduct(null)}
        title={previewProduct?.name}
        description={previewProduct?.description}
        imageUrl={previewProduct?.image}
        imageAlt={previewProduct?.name}
      >
        {previewProduct && (
          <div className="text-xs text-text-secondary flex flex-wrap gap-x-2 gap-y-1">
            <span>id: {previewProduct.id}</span>
            <span className="text-[#E5E5EA]">•</span>
            <span>магазин: {previewProduct.store_name} (#{previewProduct.store_id})</span>
            {previewProduct.category_name && (
              <>
                <span className="text-[#E5E5EA]">•</span>
                <span>категория: {previewProduct.category_name}</span>
              </>
            )}
            {previewProduct.price != null && (
              <>
                <span className="text-[#E5E5EA]">•</span>
                <span>цена: {Number(previewProduct.price).toLocaleString('ru-RU')} ₽</span>
              </>
            )}
          </div>
        )}
      </ModerationPreviewModal>
    </div>
  );
}

