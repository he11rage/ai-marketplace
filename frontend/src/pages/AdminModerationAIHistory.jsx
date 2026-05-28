import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';

export default function AdminModerationAIHistory() {
  const [userId, setUserId] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['moderation', 'ai-history', { userId }],
    queryFn: async () => {
      const res = await apiEndpoints.moderationListAIHistory({ user: userId || undefined, page_size: 50 });
      return res.data;
    },
  });

  const items = useMemo(() => (Array.isArray(data) ? data : (data?.results ?? [])), [data]);

  return (
    <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] overflow-hidden">
      <div className="p-5 border-b border-[#F2F2F7] flex flex-wrap items-center justify-between gap-3">
        <div className="font-bold text-lg">AI‑история</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="user id (опционально)"
            className="bg-[#F2F2F7] rounded-xl px-3 py-2 text-sm outline-none w-56 max-w-full"
            inputMode="numeric"
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
          {items.map((h) => (
            <div key={h.id} className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{h.username} (#{h.user})</div>
                  <div className="mt-2 text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                    <span>{h.created_at}</span>
                    <span className="text-[#E5E5EA]">•</span>
                    <span>type: <span className="font-medium text-text-primary">{h.response_type}</span></span>
                    <span className="text-[#E5E5EA]">•</span>
                    <span>tokens: <span className="font-medium text-text-primary">{h.total_tokens}</span></span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid md:grid-cols-2 gap-3">
                <div className="bg-[#F2F2F7] rounded-2xl p-4">
                  <div className="text-xs font-semibold text-text-secondary mb-2">Query</div>
                  <div className="text-sm whitespace-pre-wrap">{h.query}</div>
                </div>
                <div className="bg-[#F2F2F7] rounded-2xl p-4">
                  <div className="text-xs font-semibold text-text-secondary mb-2">Response</div>
                  <div className="text-sm whitespace-pre-wrap">{h.response}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

