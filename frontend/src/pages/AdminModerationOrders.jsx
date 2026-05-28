import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import { apiEndpoints } from '../api/axios';

function StatusPill({ status }) {
  const map = {
    created: 'bg-[#8E8E93]/10 text-[#8E8E93]',
    awaiting_payment: 'bg-[#FF9500]/10 text-[#FF9500]',
    paid: 'bg-[#34C759]/10 text-[#34C759]',
    processing: 'bg-[#007AFF]/10 text-[#007AFF]',
    shipped: 'bg-[#007AFF]/10 text-[#007AFF]',
    delivered: 'bg-[#34C759]/10 text-[#34C759]',
    cancelled: 'bg-[#FF3B30]/10 text-[#FF3B30]',
    refunded: 'bg-[#FF3B30]/10 text-[#FF3B30]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${map[status] || 'bg-[#F2F2F7] text-text-secondary'}`}>
      {status || '—'}
    </span>
  );
}

export default function AdminModerationOrders() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['moderation', 'orders', { status }],
    queryFn: async () => {
      const res = await apiEndpoints.moderationListOrders({ status: status || undefined, page_size: 50 });
      return res.data;
    },
  });

  const items = useMemo(() => (Array.isArray(data) ? data : (data?.results ?? [])), [data]);

  const setOrderStatus = async (id, next) => {
    await apiEndpoints.moderationSetOrderStatus(id, { status: next });
    await qc.invalidateQueries({ queryKey: ['moderation', 'orders'] });
  };

  return (
    <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] overflow-hidden">
      <div className="p-5 border-b border-[#F2F2F7] flex flex-wrap items-center justify-between gap-3">
        <div className="font-bold text-lg">Очередь заказов</div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#F2F2F7] rounded-xl px-3 py-2 text-sm outline-none"
          >
            <option value="">(все статусы)</option>
            <option value="created">created</option>
            <option value="awaiting_payment">awaiting_payment</option>
            <option value="paid">paid</option>
            <option value="processing">processing</option>
            <option value="shipped">shipped</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
            <option value="refunded">refunded</option>
          </select>
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
          {items.map((o) => (
            <div key={o.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold">Заказ #{o.id}</div>
                    <StatusPill status={o.status} />
                  </div>
                  <div className="mt-2 text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                    <span>покупатель: <span className="font-medium text-text-primary">{o.buyer_username}</span> (#{o.buyer})</span>
                    <span className="text-[#E5E5EA]">•</span>
                    <span>сумма: <span className="font-medium text-text-primary">{o.total_amount}</span></span>
                    <span className="text-[#E5E5EA]">•</span>
                    <span>магазины: <span className="font-medium text-text-primary">{(o.stores || []).map((s) => `${s.name}#${s.id}`).join(', ') || '—'}</span></span>
                    <span className="text-[#E5E5EA]">•</span>
                    <span>продавцы: <span className="font-medium text-text-primary">{(o.sellers || []).map((s) => `${s.username}#${s.id}`).join(', ') || '—'}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Button variant="secondary" onClick={() => setOrderStatus(o.id, 'processing')}>processing</Button>
                  <Button variant="secondary" onClick={() => setOrderStatus(o.id, 'shipped')}>shipped</Button>
                  <Button variant="secondary" onClick={() => setOrderStatus(o.id, 'delivered')}>delivered</Button>
                  <Button variant="secondary" onClick={() => setOrderStatus(o.id, 'cancelled')}>cancelled</Button>
                </div>
              </div>

              {Array.isArray(o.items) && o.items.length ? (
                <div className="mt-4 bg-[#F2F2F7] rounded-2xl p-4">
                  <div className="text-xs font-semibold text-text-secondary mb-2">Позиции</div>
                  <div className="space-y-2">
                    {o.items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0 truncate">
                          <span className="font-medium">{it.product_name}</span>
                          <span className="text-text-secondary"> × {it.quantity}</span>
                          <span className="text-text-secondary"> • {it.store_name}#{it.store_id}</span>
                          <span className="text-text-secondary"> • {it.seller_username}#{it.seller_id}</span>
                        </div>
                        <div className="shrink-0 font-semibold">{it.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

