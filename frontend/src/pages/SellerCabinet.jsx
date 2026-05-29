import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { SellerAnalyticsTab } from './seller/SellerAnalyticsTab';
import { SellerQualityTab } from './seller/SellerQualityTab';

const ORDER_STATUS_MAP = {
  created: { label: 'Создан', variant: 'default' },
  awaiting_payment: { label: 'Ожидает оплаты', variant: 'warning' },
  paid: { label: 'Оплачен', variant: 'success' },
  processing: { label: 'В обработке', variant: 'info' },
  shipped: { label: 'Отправлен', variant: 'info' },
  delivered: { label: 'Доставлен', variant: 'success' },
  cancelled: { label: 'Отменён', variant: 'error' },
  refunded: { label: 'Возвращён', variant: 'default' },
};

const PRODUCT_STATUS_MAP = {
  draft: { label: 'Черновик', variant: 'default' },
  pending_moderation: { label: 'На модерации', variant: 'warning' },
  active: { label: 'Активен', variant: 'success' },
  rejected: { label: 'Отклонён', variant: 'error' },
  blocked: { label: 'Заблокирован', variant: 'error' },
  archived: { label: 'Скрыт / архив', variant: 'default' },
};

const PRODUCT_TABS = [
  { id: '', label: 'Все' },
  { id: 'draft', label: 'Черновики' },
  { id: 'pending_moderation', label: 'На модерации' },
  { id: 'active', label: 'Активные' },
  { id: 'archived', label: 'Архив' },
];

const SELLER_ORDER_ACTIONS = {
  paid: { next: 'processing', label: 'В обработку' },
  processing: { next: 'shipped', label: 'Отправлен' },
  shipped: { next: 'delivered', label: 'Доставлен' },
};

function OrdersTab({ storeFilter }) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['seller', 'orders', { status: statusFilter, store: storeFilter }],
    queryFn: () =>
      apiEndpoints
        .sellerListOrders({
          status: statusFilter || undefined,
          store: storeFilter || undefined,
        })
        .then((res) => res.data),
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ orderId, status }) => apiEndpoints.sellerSetOrderStatus(orderId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'orders'] }),
  });

  const orders = useMemo(() => (Array.isArray(data) ? data : data?.results ?? []), [data]);

  if (isLoading) {
    return <div className="p-8 text-center text-text-secondary">Загрузка заказов...</div>;
  }

  if (isError) {
    return (
      <div className="p-6 text-[#FF3B30]">
        Ошибка: {error?.response?.data?.detail || 'не удалось загрузить заказы'}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="Заказов пока нет"
        description="Когда покупатели оформят заказы с товарами ваших магазинов, они появятся здесь."
        icon="box"
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] overflow-hidden">
      <div className="p-5 border-b border-[#F2F2F7] flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-lg">Заказы по вашим магазинам</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#F2F2F7] rounded-xl px-3 py-2 text-sm outline-none"
        >
          <option value="">Все статусы</option>
          {Object.entries(ORDER_STATUS_MAP).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      <div className="divide-y divide-[#F2F2F7]">
        {orders.map((order) => {
          const action = SELLER_ORDER_ACTIONS[order.status];
          return (
            <div key={order.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">Заказ #{order.id}</span>
                    <Badge variant={ORDER_STATUS_MAP[order.status]?.variant || 'default'}>
                      {ORDER_STATUS_MAP[order.status]?.label || order.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-text-secondary flex flex-wrap gap-2">
                    <span>
                      Покупатель: <span className="font-medium text-text-primary">{order.buyer_username}</span>
                    </span>
                    <span className="text-[#E5E5EA]">•</span>
                    <span>
                      Ваша сумма: <span className="font-medium text-text-primary">{order.seller_subtotal}₽</span>
                    </span>
                    <span className="text-[#E5E5EA]">•</span>
                    <span>{new Date(order.created_at).toLocaleString('ru-RU')}</span>
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    Магазины: {(order.stores || []).map((s) => s.name).join(', ') || '—'}
                  </div>
                </div>
                {action && (
                  <Button
                    size="sm"
                    onClick={() =>
                      setStatusMutation.mutate({ orderId: order.id, status: action.next })
                    }
                    disabled={setStatusMutation.isPending}
                  >
                    {action.label}
                  </Button>
                )}
              </div>

              {Array.isArray(order.items) && order.items.length > 0 && (
                <div className="mt-4 bg-[#F2F2F7] rounded-2xl p-4 space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-text-secondary"> × {item.quantity}</span>
                        <span className="text-text-secondary"> • {item.store_name}</span>
                      </div>
                      <span className="font-semibold shrink-0">{item.price}₽</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 text-xs text-text-secondary">
                Адрес доставки: {order.delivery_address || '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductsTab({ storeFilter, navigate }) {
  const qc = useQueryClient();
  const [statusTab, setStatusTab] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['seller', 'products', { status: statusTab, store: storeFilter, q: search }],
    queryFn: () =>
      apiEndpoints
        .sellerListProducts({
          status: statusTab || undefined,
          store: storeFilter || undefined,
          q: search || undefined,
        })
        .then((res) => res.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['seller', 'products'] });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }) => {
      if (action === 'submit') return apiEndpoints.sellerSubmitProduct(id);
      if (action === 'archive') return apiEndpoints.sellerArchiveProduct(id);
      if (action === 'hide') return apiEndpoints.sellerHideProduct(id);
      if (action === 'restore') return apiEndpoints.sellerRestoreProduct(id);
      return Promise.reject(new Error('Unknown action'));
    },
    onSuccess: invalidate,
  });

  const products = useMemo(() => (Array.isArray(data) ? data : data?.results ?? []), [data]);

  return (
    <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] overflow-hidden">
      <div className="p-5 border-b border-[#F2F2F7] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-lg">Товары</h2>
          <Button size="sm" onClick={() => navigate('/create-product')}>
            Добавить товар
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_TABS.map((tab) => (
            <button
              key={tab.id || 'all'}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                statusTab === tab.id
                  ? 'bg-[#007AFF] text-white'
                  : 'bg-[#F2F2F7] text-text-secondary hover:bg-[#E5E5EA]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию или бренду"
          className="w-full max-w-md px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm outline-none focus:bg-white focus:border-[#007AFF]"
        />
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-text-secondary">Загрузка товаров...</div>
      ) : isError ? (
        <div className="p-6 text-[#FF3B30]">
          Ошибка: {error?.response?.data?.detail || 'не удалось загрузить товары'}
        </div>
      ) : products.length === 0 ? (
        <div className="p-8">
          <EmptyState
            title="Товаров нет"
            description="Создайте черновик или опубликуйте новый товар."
            icon="box"
            actionLabel="Добавить товар"
            onAction={() => navigate('/create-product')}
          />
        </div>
      ) : (
        <div className="divide-y divide-[#F2F2F7]">
          {products.map((product) => (
            <div key={product.id} className="p-5 flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-4 min-w-0">
                <div className="w-16 h-16 rounded-xl bg-[#F2F2F7] overflow-hidden shrink-0">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-secondary text-lg font-semibold">
                      {product.name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{product.name}</span>
                    <Badge variant={PRODUCT_STATUS_MAP[product.status]?.variant || 'default'}>
                      {PRODUCT_STATUS_MAP[product.status]?.label || product.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-text-secondary mt-1">
                    {product.store_name} • {product.price}₽ • остаток: {product.stock_quantity}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => navigate(`/create-product/${product.id}`)}>
                  Редактировать
                </Button>
                {product.status === 'draft' && (
                  <Button
                    size="sm"
                    onClick={() => actionMutation.mutate({ id: product.id, action: 'submit' })}
                    disabled={actionMutation.isPending}
                  >
                    На модерацию
                  </Button>
                )}
                {product.status === 'active' && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => actionMutation.mutate({ id: product.id, action: 'hide' })}
                      disabled={actionMutation.isPending}
                    >
                      Скрыть
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => actionMutation.mutate({ id: product.id, action: 'archive' })}
                      disabled={actionMutation.isPending}
                    >
                      В архив
                    </Button>
                  </>
                )}
                {product.status === 'archived' && (
                  <Button
                    size="sm"
                    onClick={() => actionMutation.mutate({ id: product.id, action: 'restore' })}
                    disabled={actionMutation.isPending}
                  >
                    Вернуть
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SellerCabinet() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  const [storeFilter, setStoreFilter] = useState('');

  const { data: stores } = useQuery({
    queryKey: ['my-stores'],
    queryFn: () => apiEndpoints.getMyStores().then((res) => res.data),
  });

  const tabs = [
    { id: 'orders', label: 'Заказы' },
    { id: 'products', label: 'Товары' },
    { id: 'analytics', label: 'Аналитика' },
    { id: 'quality', label: 'Качество' },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('/account')}
            className="text-sm text-text-secondary hover:text-text-primary transition mb-2"
          >
            ← Личный кабинет
          </button>
          <h1 className="text-2xl font-bold">Кабинет продавца</h1>
          <p className="text-sm text-text-secondary mt-1">
            Заказы, товары, аналитика продаж и качество магазинов
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="bg-[#F2F2F7] rounded-xl px-3 py-2 text-sm outline-none min-w-[180px]"
          >
            <option value="">Все магазины</option>
            {(stores || []).map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-[#E5E5EA]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === tab.id
                ? 'border-[#007AFF] text-[#007AFF]'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && <OrdersTab storeFilter={storeFilter} />}
      {activeTab === 'products' && (
        <ProductsTab storeFilter={storeFilter} navigate={navigate} />
      )}
      {activeTab === 'analytics' && <SellerAnalyticsTab storeFilter={storeFilter} />}
      {activeTab === 'quality' && <SellerQualityTab storeFilter={storeFilter} />}
    </div>
  );
}
