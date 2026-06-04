import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../../api/axios';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

function formatMoney(value) {
  const num = Number(value || 0);
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function SalesChart({ salesByDay }) {
  const maxRevenue = useMemo(() => {
    const values = (salesByDay || []).map((d) => Number(d.revenue || 0));
    return Math.max(...values, 1);
  }, [salesByDay]);

  if (!salesByDay?.length) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="text-xs text-text-secondary mb-2">Выручка за 14 дней</div>
      <div className="flex items-end gap-1 h-24">
        {salesByDay.map((day) => {
          const height = Math.max(4, (Number(day.revenue) / maxRevenue) * 100);
          const label = new Date(day.date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
          });
          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-1 min-w-0"
              title={`${label}: ${formatMoney(day.revenue)} ₽`}
            >
              <div
                className="w-full bg-[#007AFF]/80 rounded-t-md transition-all"
                style={{ height: `${height}%` }}
              />
              <span className="text-[9px] text-text-secondary truncate w-full text-center hidden sm:block">
                {new Date(day.date).getDate()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SellerAnalyticsTab({ storeFilter }) {
  const navigate = useNavigate();
  const params = storeFilter ? { store: storeFilter } : {};

  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useQuery({
    queryKey: ['seller', 'analytics', 'overview', storeFilter],
    queryFn: () => apiEndpoints.sellerAnalyticsOverview(params).then((res) => res.data),
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['seller', 'analytics', 'products', storeFilter],
    queryFn: () => apiEndpoints.sellerAnalyticsProducts(params).then((res) => res.data),
  });

  const { data: lowStock, isLoading: lowStockLoading } = useQuery({
    queryKey: ['seller', 'analytics', 'low-stock', storeFilter],
    queryFn: () => apiEndpoints.sellerAnalyticsLowStock(params).then((res) => res.data),
  });

  const isLoading = overviewLoading || productsLoading || lowStockLoading;

  if (isLoading) {
    return <div className="p-8 text-center text-text-secondary">Загрузка аналитики...</div>;
  }

  if (overviewError) {
    return (
      <div className="p-6 text-[#FF3B30]">Не удалось загрузить аналитику продаж.</div>
    );
  }

  const growth = overview?.revenue_week_growth_percent ?? 0;
  const growthClass = growth >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]';
  const growthLabel = `${growth >= 0 ? '+' : ''}${Number(growth).toFixed(1)}%`;

  const catalog = productsData?.catalog_summary || {};
  const topProducts = productsData?.top_by_revenue || [];
  const lowStockItems = lowStock?.items || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] p-5">
          <div className="text-sm text-text-secondary mb-1">Выручка (всего)</div>
          <div className="text-2xl font-bold">{formatMoney(overview?.total_revenue)} ₽</div>
          <div className={`text-xs mt-1 ${growthClass}`}>За неделю: {growthLabel}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] p-5">
          <div className="text-sm text-text-secondary mb-1">За эту неделю</div>
          <div className="text-2xl font-bold">{formatMoney(overview?.revenue_this_week)} ₽</div>
        </div>
        <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] p-5">
          <div className="text-sm text-text-secondary mb-1">Заказов</div>
          <div className="text-2xl font-bold">{overview?.orders_total ?? 0}</div>
          <div className="text-xs text-text-secondary mt-1">
            За неделю: {overview?.orders_this_week ?? 0}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] p-5">
          <div className="text-sm text-text-secondary mb-1">Продано единиц</div>
          <div className="text-2xl font-bold">{overview?.units_sold ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] overflow-hidden">
          <div className="p-5 border-b border-[#F2F2F7]">
            <h2 className="font-bold text-lg">Товары по выручке</h2>
            <p className="text-sm text-text-secondary mt-1">Топ продаж среди подтверждённых заказов</p>
          </div>
          {topProducts.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Продаж пока нет"
                description="Когда появятся оплаченные заказы, здесь отобразится рейтинг товаров."
                icon="box"
              />
            </div>
          ) : (
            <div className="divide-y divide-[#F2F2F7]">
              {topProducts.map((item, index) => (
                <div key={item.product_id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-secondary w-5">#{index + 1}</span>
                      <span className="font-medium truncate">{item.name}</span>
                    </div>
                    <div className="text-xs text-text-secondary mt-1 ml-7">
                      {item.store_name} • {item.units_sold} шт.
                    </div>
                  </div>
                  <span className="font-semibold shrink-0">{formatMoney(item.revenue)} ₽</span>
                </div>
              ))}
            </div>
          )}
          <div className="p-4 bg-[#F2F2F7]/50 text-xs text-text-secondary flex flex-wrap gap-3">
            <span>Всего: {catalog.total ?? 0}</span>
            <span>Активных: {catalog.active ?? 0}</span>
            <span>На модерации: {catalog.pending_moderation ?? 0}</span>
            <span>Черновиков: {catalog.draft ?? 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] overflow-hidden">
          <div className="p-5 border-b border-[#F2F2F7] flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-lg">Низкий остаток</h2>
              <p className="text-sm text-text-secondary mt-1">
                Меньше {lowStock?.threshold ?? 5} шт. на складе
              </p>
            </div>
            {(lowStock?.count ?? 0) > 0 && (
              <Badge variant="warning">{lowStock.count}</Badge>
            )}
          </div>
          {lowStockItems.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Всё в порядке"
                description="Нет товаров с критически низким остатком."
                icon="box"
              />
            </div>
          ) : (
            <div className="divide-y divide-[#F2F2F7]">
              {lowStockItems.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-xs text-text-secondary mt-1">
                      {item.store_name} • остаток:{' '}
                      <span className="text-[#FF9500] font-semibold">{item.stock_quantity}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/create-product/${item.id}`)}
                  >
                    Пополнить
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
