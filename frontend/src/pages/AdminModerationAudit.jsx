import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';

export default function AdminModerationAudit() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['moderation', 'audit'],
    queryFn: async () => {
      const res = await apiEndpoints.moderationListAudit({ page_size: 100 });
      return res.data;
    },
  });

  const items = useMemo(() => (Array.isArray(data) ? data : (data?.results ?? [])), [data]);

  return (
    <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] overflow-hidden">
      <div className="p-5 border-b border-[#F2F2F7] flex flex-wrap items-center justify-between gap-3">
        <div className="font-bold text-lg">Аудит действий</div>
        <div className="text-sm text-text-secondary">Последние действия модераторов (кто/что/когда/IP/UA).</div>
      </div>

      {isLoading ? (
        <div className="p-6 text-text-secondary">Загрузка…</div>
      ) : isError ? (
        <div className="p-6 text-[#FF3B30]">Ошибка: {error?.response?.data?.detail || 'не удалось загрузить'}</div>
      ) : items.length === 0 ? (
        <div className="p-6 text-text-secondary">Пусто.</div>
      ) : (
        <div className="divide-y divide-[#F2F2F7]">
          {items.map((a) => (
            <div key={a.id} className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{a.action}</div>
                  <div className="mt-2 text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                    <span>actor: <span className="font-medium text-text-primary">{a.actor_username || '—'}</span></span>
                    <span className="text-[#E5E5EA]">•</span>
                    <span>object: <span className="font-medium text-text-primary">{a.object_type}:{a.object_id}</span></span>
                    <span className="text-[#E5E5EA]">•</span>
                    <span>{a.created_at}</span>
                    {a.ip_address ? (
                      <>
                        <span className="text-[#E5E5EA]">•</span>
                        <span>ip: <span className="font-medium text-text-primary">{a.ip_address}</span></span>
                      </>
                    ) : null}
                    {a.request_method || a.request_path ? (
                      <>
                        <span className="text-[#E5E5EA]">•</span>
                        <span>
                          req:{' '}
                          <span className="font-medium text-text-primary">
                            {a.request_method || '—'} {a.request_path || ''}
                          </span>
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              {a.user_agent ? (
                <div className="mt-2 text-xs text-text-secondary">
                  UA:{' '}
                  <span className="text-text-primary break-words">
                    {String(a.user_agent).length > 220 ? `${String(a.user_agent).slice(0, 220)}…` : a.user_agent}
                  </span>
                </div>
              ) : null}
              {a.payload && Object.keys(a.payload).length ? (
                <pre className="mt-3 text-xs bg-[#F2F2F7] rounded-2xl p-4 overflow-auto">{JSON.stringify(a.payload, null, 2)}</pre>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

