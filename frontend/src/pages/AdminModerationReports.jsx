import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import { apiEndpoints } from '../api/axios';

function StatusPill({ status }) {
  const map = {
    open: 'bg-[#FF3B30]/10 text-[#FF3B30]',
    resolved: 'bg-[#34C759]/10 text-[#34C759]',
    rejected: 'bg-[#8E8E93]/10 text-[#8E8E93]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${map[status] || 'bg-[#F2F2F7] text-text-secondary'}`}>
      {status || '—'}
    </span>
  );
}

export default function AdminModerationReports() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('open');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['moderation', 'reports', { status }],
    queryFn: async () => {
      const res = await apiEndpoints.moderationListReports({ status, page_size: 50 });
      return res.data;
    },
  });

  const items = useMemo(() => (Array.isArray(data) ? data : (data?.results ?? [])), [data]);

  const resolve = async (id) => {
    await apiEndpoints.moderationResolveReport(id, { note: '' });
    await qc.invalidateQueries({ queryKey: ['moderation', 'reports'] });
  };

  const reject = async (id) => {
    await apiEndpoints.moderationRejectReport(id, { note: '' });
    await qc.invalidateQueries({ queryKey: ['moderation', 'reports'] });
  };

  return (
    <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] overflow-hidden">
      <div className="p-5 border-b border-[#F2F2F7] flex flex-wrap items-center justify-between gap-3">
        <div className="font-bold text-lg">Жалобы</div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#F2F2F7] rounded-xl px-3 py-2 text-sm outline-none"
          >
            <option value="open">open</option>
            <option value="resolved">resolved</option>
            <option value="rejected">rejected</option>
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
          {items.map((r) => (
            <div key={r.id} className="p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold">Report #{r.id}</div>
                  <StatusPill status={r.status} />
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#007AFF]/10 text-[#007AFF]">
                    {r.target_type}
                  </span>
                </div>
                <div className="mt-2 text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                  <span>от: <span className="font-medium text-text-primary">{r.reporter_username}</span></span>
                  <span className="text-[#E5E5EA]">•</span>
                  <span>reason: <span className="font-medium text-text-primary">{r.reason}</span></span>
                  {r.product ? (
                    <>
                      <span className="text-[#E5E5EA]">•</span>
                      <span>product: <span className="font-medium text-text-primary">#{r.product}</span></span>
                    </>
                  ) : null}
                  {r.store ? (
                    <>
                      <span className="text-[#E5E5EA]">•</span>
                      <span>store: <span className="font-medium text-text-primary">#{r.store}</span></span>
                    </>
                  ) : null}
                  {r.review ? (
                    <>
                      <span className="text-[#E5E5EA]">•</span>
                      <span>review: <span className="font-medium text-text-primary">#{r.review}</span></span>
                    </>
                  ) : null}
                </div>
                {r.description ? (
                  <div className="mt-3 text-sm text-text-primary whitespace-pre-wrap">
                    {r.description}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="secondary" onClick={() => resolve(r.id)}>
                  Resolve
                </Button>
                <Button variant="secondary" onClick={() => reject(r.id)}>
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

