import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../../api/axios';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

const STORE_STATUS_MAP = {
  pending_moderation: { label: 'На модерации', variant: 'warning' },
  active: { label: 'Активен', variant: 'success' },
  limited: { label: 'Ограничен', variant: 'warning' },
  blocked: { label: 'Заблокирован', variant: 'error' },
  rejected: { label: 'Отклонён', variant: 'error' },
};

function QualityScoreRing({ score }) {
  const color =
    score >= 80 ? '#34C759' : score >= 60 ? '#FF9500' : score >= 40 ? '#FF9500' : '#FF3B30';
  const label =
    score >= 80 ? 'Отлично' : score >= 60 ? 'Хорошо' : score >= 40 ? 'Средне' : 'Требует внимания';

  return (
    <div className="flex flex-col items-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center border-4 font-bold text-xl"
        style={{ borderColor: color, color }}
      >
        {score}
      </div>
      <span className="text-xs text-text-secondary mt-2">{label}</span>
    </div>
  );
}

function MetricRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5">
      <span className="text-text-secondary">{label}</span>
      <span className={highlight ? 'font-semibold text-[#FF9500]' : 'font-medium'}>{value}</span>
    </div>
  );
}

export function SellerQualityTab({ storeFilter }) {
  const navigate = useNavigate();
  const params = storeFilter ? { store: storeFilter } : {};

  const { data, isLoading, isError } = useQuery({
    queryKey: ['seller', 'analytics', 'quality', storeFilter],
    queryFn: () => apiEndpoints.sellerAnalyticsQuality(params).then((res) => res.data),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-text-secondary">Загрузка качества магазинов...</div>;
  }

  if (isError) {
    return <div className="p-6 text-[#FF3B30]">Не удалось загрузить данные о качестве.</div>;
  }

  const stores = data?.stores || [];

  if (stores.length === 0) {
    return (
      <EmptyState
        title="Нет магазинов"
        description="Создайте магазин, чтобы отслеживать его качество и репутацию."
        icon="box"
        actionLabel="Создать магазин"
        onAction={() => navigate('/create-store')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-secondary">
        Оценка качества учитывает статус магазина, рейтинг, модерацию товаров, остатки и отзывы.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stores.map((store) => {
          const statusMeta = STORE_STATUS_MAP[store.store_status] || {
            label: store.store_status,
            variant: 'default',
          };
          const metrics = store.metrics || {};

          return (
            <div
              key={store.store_id}
              className="bg-white rounded-2xl shadow-subtle border border-[#E5E5EA] p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-lg">{store.store_name}</h2>
                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    {store.is_verified && <Badge variant="success">Проверен</Badge>}
                  </div>
                  <div className="text-sm text-text-secondary mt-1">
                    Рейтинг: {store.rating} ★ • {store.review_count} отзывов
                  </div>
                </div>
                <QualityScoreRing score={store.quality_score} />
              </div>

              {store.moderation_reason && (
                <div className="mb-4 p-3 rounded-xl bg-[#FF3B30]/10 text-sm text-[#FF3B30]">
                  <p>Модерация: {store.moderation_reason}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-[#FF3B30]/30 text-[#FF3B30] hover:bg-[#FF3B30]/10 hover:border-[#FF3B30]/50"
                    onClick={() => navigate(`/create-store/${store.store_id}`)}
                  >
                    Редактировать магазин
                  </Button>
                </div>
              )}

              <div className="space-y-1 border-t border-[#F2F2F7] pt-4">
                <MetricRow label="Активных товаров" value={metrics.active_products ?? 0} />
                <MetricRow
                  label="На модерации"
                  value={metrics.pending_moderation_products ?? 0}
                  highlight={(metrics.pending_moderation_products ?? 0) > 0}
                />
                <MetricRow
                  label="Отклонённых товаров"
                  value={metrics.rejected_products ?? 0}
                  highlight={(metrics.rejected_products ?? 0) > 0}
                />
                <MetricRow
                  label="Низкий остаток"
                  value={metrics.low_stock_products ?? 0}
                  highlight={(metrics.low_stock_products ?? 0) > 0}
                />
                <MetricRow label="Одобренных отзывов" value={metrics.approved_reviews ?? 0} />
                <MetricRow
                  label="Отзывов на модерации"
                  value={metrics.pending_reviews ?? 0}
                  highlight={(metrics.pending_reviews ?? 0) > 0}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
