export const PRODUCT_STATUS_ACTIONS = {
  draft: {
    title: 'На доработку',
    description: 'Товар вернётся продавцу для исправления.',
    confirmLabel: 'Отправить на доработку',
    confirmVariant: 'primary',
  },
  rejected: {
    title: 'Отклонить товар',
    description: 'Товар будет отклонён и не появится в каталоге.',
    confirmLabel: 'Отклонить',
    confirmVariant: 'destructive',
  },
  blocked: {
    title: 'Заблокировать товар',
    description: 'Товар будет заблокирован.',
    confirmLabel: 'Заблокировать',
    confirmVariant: 'destructive',
  },
};

export const STORE_STATUS_ACTIONS = {
  limited: {
    title: 'На доработку',
    description: 'Магазин будет ограничен до исправления замечаний.',
    confirmLabel: 'Отправить на доработку',
    confirmVariant: 'primary',
  },
  rejected: {
    title: 'Отклонить магазин',
    description: 'Магазин будет отклонён и не сможет продавать товары.',
    confirmLabel: 'Отклонить',
    confirmVariant: 'destructive',
  },
  blocked: {
    title: 'Заблокировать магазин',
    description: 'Магазин будет заблокирован.',
    confirmLabel: 'Заблокировать',
    confirmVariant: 'destructive',
  },
};
