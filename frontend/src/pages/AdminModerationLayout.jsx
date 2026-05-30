import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

const nav = [
  { to: '/admin/moderation/products', label: 'Очередь товаров' },
  { to: '/admin/moderation/categories', label: 'Очередь категорий' },
  { to: '/admin/moderation/stores', label: 'Очередь магазинов' },
  { to: '/admin/moderation/orders', label: 'Очередь заказов' },
  { to: '/admin/moderation/reports', label: 'Жалобы' },
  { to: '/admin/moderation/users', label: 'Пользователи' },
  { to: '/admin/moderation/audit', label: 'Аудит действий' },
  { to: '/admin/moderation/ai-history', label: 'AI-история' },
];

function LinkItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => (
        `block px-4 py-2 rounded-xl text-sm transition ${
          isActive
            ? 'bg-[#007AFF]/10 text-[#007AFF] font-semibold'
            : 'text-text-secondary hover:bg-[#F2F2F7] hover:text-text-primary'
        }`
      )}
      end
    >
      {children}
    </NavLink>
  );
}

export default function AdminModerationLayout() {
  const navigate = useNavigate();

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-10">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <div className="inline-flex items-center rounded-full bg-[#007AFF]/10 px-3 py-1 text-xs font-semibold text-[#007AFF] mb-4">
            Admin
          </div>
          <h1 className="text-3xl font-bold mb-2">Модерация</h1>
          <p className="text-text-secondary max-w-2xl">
            Очереди и инструменты модератора: товары, категории, магазины, заказы, жалобы, пользователи, аудит и AI‑история.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/admin-panel')}>
            В админ‑дашборд
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            На главную
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <aside className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] p-4">
          <div className="text-xs font-semibold text-text-secondary px-2 mb-3">Разделы</div>
          <nav className="space-y-1">
            {nav.map((item) => (
              <LinkItem key={item.to} to={item.to}>{item.label}</LinkItem>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}

