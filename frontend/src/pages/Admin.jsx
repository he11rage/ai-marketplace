import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function Admin() {
  const navigate = useNavigate();

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-10">
      <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center rounded-full bg-[#007AFF]/10 px-3 py-1 text-xs font-semibold text-[#007AFF] mb-4">
              Admin
            </div>
            <h1 className="text-3xl font-bold mb-3">Админ-панель</h1>
            <p className="text-text-secondary max-w-2xl">
              Это временная страница-заглушка для проверки `AdminRoute`.
              Если вы видите этот экран, текущий пользователь прошел проверку `user.is_admin`.
            </p>
          </div>

          <Button variant="secondary" onClick={() => navigate('/')}>
            На главную
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="rounded-2xl bg-[#F2F2F7] p-5">
            <div className="text-sm text-text-secondary mb-1">Доступ</div>
            <div className="font-semibold">Только администратор</div>
          </div>
          <div className="rounded-2xl bg-[#F2F2F7] p-5">
            <div className="text-sm text-text-secondary mb-1">Маршрут</div>
            <div className="font-semibold">/admin</div>
          </div>
          <div className="rounded-2xl bg-[#F2F2F7] p-5">
            <div className="text-sm text-text-secondary mb-1">Статус</div>
            <div className="font-semibold">Заглушка готова</div>
          </div>
        </div>
      </div>
    </div>
  );
}
