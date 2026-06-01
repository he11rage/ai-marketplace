import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import { apiEndpoints } from '../api/axios';
import { ROLE_LABELS, USER_ROLES } from '../utils/roles';

export default function AdminModerationUsers() {
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['moderation', 'users'],
    queryFn: async () => {
      const res = await apiEndpoints.moderationListUsers({ page_size: 50 });
      return res.data;
    },
  });

  const items = useMemo(() => (Array.isArray(data) ? data : (data?.results ?? [])), [data]);

  const patchUser = async (id, payload) => {
    await apiEndpoints.moderationPatchUser(id, payload);
    await qc.invalidateQueries({ queryKey: ['moderation', 'users'] });
  };

  return (
    <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] overflow-hidden">
      <div className="p-5 border-b border-[#F2F2F7] flex flex-wrap items-center justify-between gap-3">
        <div className="font-bold text-lg">Пользователи</div>
        <div className="text-sm text-text-secondary">Роли: покупатель, продавец, админ. Также активный и сотрудник.</div>
      </div>

      {isLoading ? (
        <div className="p-6 text-text-secondary">Загрузка…</div>
      ) : isError ? (
        <div className="p-6 text-[#FF3B30]">Ошибка: {error?.response?.data?.detail || 'не удалось загрузить'}</div>
      ) : items.length === 0 ? (
        <div className="p-6 text-text-secondary">Пусто.</div>
      ) : (
        <div className="divide-y divide-[#F2F2F7]">
          {items.map((u) => (
            <div key={u.id} className="p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold truncate">{u.username}</div>
                <div className="mt-2 text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                  <span>id: <span className="font-medium text-text-primary">{u.id}</span></span>
                  <span className="text-[#E5E5EA]">•</span>
                  <span>email: <span className="font-medium text-text-primary">{u.email || '—'}</span></span>
                  <span className="text-[#E5E5EA]">•</span>
                  <span>роль: <span className="font-medium text-text-primary">{ROLE_LABELS[u.role] || u.role || '—'}</span></span>
                  <span className="text-[#E5E5EA]">•</span>
                  <span>active: <span className="font-medium text-text-primary">{String(Boolean(u.is_active))}</span></span>
                  <span className="text-[#E5E5EA]">•</span>
                  <span>staff: <span className="font-medium text-text-primary">{String(Boolean(u.is_staff))}</span></span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <Button variant="secondary" onClick={() => patchUser(u.id, { is_active: !u.is_active })}>
                  {u.is_active ? 'Деактивировать' : 'Активировать'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => patchUser(u.id, { role: USER_ROLES.BUYER })}
                  disabled={u.role === USER_ROLES.BUYER}
                >
                  Покупатель
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => patchUser(u.id, { role: USER_ROLES.SELLER })}
                  disabled={u.role === USER_ROLES.SELLER}
                >
                  Продавец
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => patchUser(u.id, { role: USER_ROLES.ADMIN })}
                  disabled={u.role === USER_ROLES.ADMIN}
                >
                  Админ
                </Button>
                <Button variant="secondary" onClick={() => patchUser(u.id, { is_staff: !u.is_staff })}>
                  {u.is_staff ? 'Снять сотрудника' : 'Сделать сотрудником'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

