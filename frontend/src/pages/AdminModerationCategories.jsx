import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import { apiEndpoints } from '../api/axios';

export default function AdminModerationCategories() {
  const qc = useQueryClient();
  const [verified, setVerified] = useState('false');
  const [q, setQ] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['moderation', 'categories', { verified, q }],
    queryFn: async () => {
      const res = await apiEndpoints.moderationListCategories({
        verified,
        q: q || undefined,
        page_size: 50,
      });
      return res.data;
    },
  });

  const items = useMemo(() => (Array.isArray(data) ? data : (data?.results ?? [])), [data]);

  const verifyCategory = async (id) => {
    await apiEndpoints.moderationVerifyCategory(id);
    await qc.invalidateQueries({ queryKey: ['moderation', 'categories'] });
    await qc.invalidateQueries({ queryKey: ['moderation', 'products'] });
  };

  const rejectCategory = async (id) => {
    const reason = window.prompt('Причина отклонения (необязательно):', '') ?? '';
    if (!window.confirm('Отклонить категорию? Товары потеряют привязку к ней.')) return;
    await apiEndpoints.moderationRejectCategory(id, { reason });
    await qc.invalidateQueries({ queryKey: ['moderation', 'categories'] });
    await qc.invalidateQueries({ queryKey: ['moderation', 'products'] });
  };

  return (
    <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] overflow-hidden">
      <div className="p-5 border-b border-[#F2F2F7] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-bold text-lg">Очередь категорий</div>
          <p className="mt-1 text-sm text-text-secondary">
            Кастомные категории, которые продавцы добавили при создании товара.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={verified}
            onChange={(e) => setVerified(e.target.value)}
            className="bg-[#F2F2F7] rounded-xl px-3 py-2 text-sm outline-none"
          >
            <option value="false">На проверке</option>
            <option value="true">Проверенные</option>
            <option value="all">Все</option>
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
        <div className="p-6 text-text-secondary">Нет категорий в этой очереди.</div>
      ) : (
        <div className="divide-y divide-[#F2F2F7]">
          {items.map((category) => (
            <div key={category.id} className="p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold truncate">{category.name}</div>
                  {category.is_verified ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#34C759]/10 text-[#34C759]">
                      Проверена
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#FF9500]/10 text-[#FF9500]">
                      На проверке
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                  <span>id: <span className="font-medium text-text-primary">{category.id}</span></span>
                  <span className="text-[#E5E5EA]">•</span>
                  <span>slug: <span className="font-medium text-text-primary">{category.slug}</span></span>
                  {category.created_by_username && (
                    <>
                      <span className="text-[#E5E5EA]">•</span>
                      <span>автор: <span className="font-medium text-text-primary">{category.created_by_username}</span> (#{category.created_by_id})</span>
                    </>
                  )}
                  <span className="text-[#E5E5EA]">•</span>
                  <span>товаров: <span className="font-medium text-text-primary">{category.products_count ?? 0}</span></span>
                </div>
              </div>
              {!category.is_verified && (
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <Button variant="secondary" onClick={() => verifyCategory(category.id)}>
                    Принять
                  </Button>
                  <Button variant="secondary" onClick={() => rejectCategory(category.id)}>
                    Отклонить
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
