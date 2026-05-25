import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../hooks/useCart';

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

const STORE_STATUS_MAP = {
    pending_moderation: { label: 'На модерации', variant: 'warning' },
    active: { label: 'Активен', variant: 'success' },
    limited: { label: 'Ограничен', variant: 'warning' },
    blocked: { label: 'Заблокирован', variant: 'error' },
    rejected: { label: 'Отклонён', variant: 'error' },
};

const CUSTOMER_EDITABLE_ORDER_STATUSES = new Set(['created', 'awaiting_payment']);
const isCustomerEditableOrder = (status) => CUSTOMER_EDITABLE_ORDER_STATUSES.has(status);

export default function Account() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem('access_token');

    useEffect(() => {
        const requestedTab = location.state?.tab;
        const allowedTabs = ['dashboard', 'orders', 'stores', 'favorites', 'settings'];

        if (requestedTab && allowedTabs.includes(requestedTab) && requestedTab !== activeTab) {
            const timeoutId = window.setTimeout(() => setActiveTab(requestedTab), 0);
            return () => window.clearTimeout(timeoutId);
        }
    }, [activeTab, location.state]);

    // Load current user profile.
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => apiEndpoints.me().then(res => res.data),
        enabled: !!token,
    });

    // Clear auth state and reload to reset client caches.
    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('cart'); 
        navigate('/');
        window.location.reload();
    };

    if (!token) {
        navigate('/login');
        return null;
    }

    // Build initials for avatar fallback.
    const getUserInitials = () => {
        if (!user) return 'АИ';

        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const username = user.username || '';

        if (firstName && lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        } else if (firstName) {
            return firstName.charAt(0).toUpperCase();
        } else if (username) {
            return username.charAt(0).toUpperCase();
        }

        return 'АИ';
    };

    // Build display name for account header.
    const getUserName = () => {
        if (!user) return 'Пользователь';

        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const username = user.username || '';

        if (firstName && lastName) {
            return `${firstName} ${lastName}`;
        } else if (firstName) {
            return firstName;
        } else if (username) {
            return username;
        }

        return 'Пользователь';
    };

    const tabs = [
        { id: 'dashboard', label: 'Обзор' },
        { id: 'orders', label: 'Заказы' },
        { id: 'stores', label: 'Магазины' },
        { id: 'favorites', label: 'Избранное' },
        { id: 'settings', label: 'Настройки' },
    ];

    return (
        <div className="max-w-[1440px] mx-auto px-6 py-6 flex gap-6">
            {/* Sidebar */}
            <aside className="w-64 bg-white rounded-2xl shadow-subtle p-4 h-fit sticky top-20 flex flex-col">
                <div className="flex-1">
                    <div className="flex items-center gap-3 p-3 mb-4 bg-[#F5F5F7] rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white font-bold text-lg">
                            {getUserInitials()}
                        </div>
                        <div>
                            <div className="font-semibold text-sm">{getUserName()}</div>
                            <div className="text-xs text-text-secondary">
                                {user?.is_admin ? 'Администратор' : 'Покупатель'}
                            </div>
                        </div>
                    </div>
                    <nav className="space-y-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === tab.id
                                        ? 'bg-[#007AFF]/10 text-[#007AFF]'
                                        : 'text-text-secondary hover:bg-[#F2F2F7]'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Logout button pinned to sidebar bottom. */}
                <button
                    onClick={handleLogout}
                    className="w-full mt-4 px-3 py-2.5 rounded-xl text-sm font-medium text-[#FF3B30] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 transition flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Выйти
                </button>
            </aside>

            {/* Content */}
            <main className="flex-1">
                {activeTab === 'dashboard' && <DashboardContent navigate={navigate} user={user} />}
                {activeTab === 'orders' && <OrdersContent />}
                {activeTab === 'stores' && <StoresContent navigate={navigate} />}
                {activeTab === 'favorites' && <FavoritesContent />}
                {activeTab === 'settings' && <SettingsContent />}
            </main>
        </div>
    );
}

// Dashboard tab.
function DashboardContent({ navigate, user }) {
    const { data: orders, isLoading: ordersLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: () => apiEndpoints.getOrders().then(res => res.data),
    });

    const { data: stores, isLoading: storesLoading } = useQuery({
        queryKey: ['my-stores-dashboard'],
        queryFn: () => apiEndpoints.getMyStores().then(res => res.data),
    });

    const { data: products, isLoading: productsLoading } = useQuery({
        queryKey: ['products'],
        queryFn: () => apiEndpoints.getProducts().then(res => res.data),
    });

    const userStores = stores || [];
    const activeStoresCount = userStores.filter(store => store.status === 'active').length;

    const userProducts = products?.filter(product =>
        userStores.some(store => store.id === product.store)
    ) || [];

    const confirmedOwnerIncome = Number(user?.confirmed_owner_items_count || 0);
    const currentWeekIncome = Number(user?.confirmed_owner_items_week_count || 0);
    const previousWeekIncome = Number(user?.confirmed_owner_items_previous_week_count || 0);
    const weeklyIncomeGrowth = previousWeekIncome === 0
        ? (currentWeekIncome > 0 ? 100 : 0)
        : ((currentWeekIncome - previousWeekIncome) / previousWeekIncome) * 100;
    const formattedWeeklyIncomeGrowth = `${weeklyIncomeGrowth >= 0 ? '+' : ''}${weeklyIncomeGrowth.toFixed(1)}%`;
    const weeklyGrowthColorClass = weeklyIncomeGrowth >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]';

    const lowStockProducts = userProducts.filter(p => (p.stock_quantity || 0) < 5).length;

    const statusMap = ORDER_STATUS_MAP;

    const isLoading = ordersLoading || storesLoading || productsLoading;

    if (isLoading) {
        return (
            <div className="space-y-6 animate-fade">
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-xl shadow-subtle p-5">
                            <div className="animate-pulse">
                                <div className="h-4 bg-[#E5E5EA] rounded w-24 mb-2"></div>
                                <div className="h-8 bg-[#E5E5EA] rounded w-16"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade">
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-subtle p-5">
                    <div className="text-sm text-text-secondary mb-1">Всего заказов</div>
                    <div className="text-2xl font-bold">{orders?.length || 0}</div>
                </div>
                <div className="bg-white rounded-xl shadow-subtle p-5">
                    <div className="text-sm text-text-secondary mb-1">Активных магазинов</div>
                    <div className="text-2xl font-bold">{activeStoresCount}</div>
                </div>
                <div className="bg-white rounded-xl shadow-subtle p-5">
                    <div className="text-sm text-text-secondary mb-1">Доход</div>
                    <div className="text-2xl font-bold">
                        {confirmedOwnerIncome.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₽
                    </div>
                    <div className={`text-xs mt-1 ${weeklyGrowthColorClass}`}>За неделю: {formattedWeeklyIncomeGrowth}</div>
                </div>
                <div className="bg-white rounded-xl shadow-subtle p-5">
                    <div className="text-sm text-text-secondary mb-1">Товары</div>
                    <div className="text-2xl font-bold">{userProducts.length}</div>
                    {lowStockProducts > 0 && (
                        <div className="text-xs text-[#FF9500] mt-1">{lowStockProducts} мало на складе</div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-subtle p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Последние заказы</h2>
                    <button
                        onClick={() => navigate('/account', { state: { tab: 'orders' } })}
                        className="text-[#007AFF] text-sm font-medium hover:underline"
                    >
                        Все заказы →
                    </button>
                </div>

                {orders && orders.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-text-secondary border-b border-[#E5E5EA]">
                                <tr className="text-left">
                                    <th className="pb-3 font-medium">ID</th>
                                    <th className="pb-3 font-medium">Товар</th>
                                    <th className="pb-3 font-medium">Дата</th>
                                    <th className="pb-3 font-medium">Сумма</th>
                                    <th className="pb-3 font-medium">Статус</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F2F2F7]">
                                {orders.slice(0, 5).map(order => (
                                    <tr key={order.id}>
                                        <td className="py-3 font-medium">#{order.id}</td>
                                        <td className="py-3">{order.items?.[0]?.name || 'Товар'}</td>
                                        <td className="py-3 text-text-secondary">{new Date(order.created_at).toLocaleDateString('ru-RU')}</td>
                                        <td className="py-3 font-medium">{order.total}₽</td>
                                        <td className="py-3">
                                            <Badge variant={statusMap[order.status]?.variant || 'default'}>
                                                {statusMap[order.status]?.label || order.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-text-secondary">
                        У вас пока нет заказов
                    </div>
                )}
            </div>
        </div>
    );
}

// Orders tab.
function OrdersContent() {
    const queryClient = useQueryClient();
    const { data: orders, isLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: () => apiEndpoints.getOrders().then(res => res.data),
    });
    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: () => apiEndpoints.getProducts().then(res => res.data),
    });
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [newAddress, setNewAddress] = useState('');
    const [actionError, setActionError] = useState('');

    const productsById = new Map((products || []).map(product => [product.id, product]));

    const statusMap = ORDER_STATUS_MAP;
    const paymentMethodMap = {
        card: 'Банковская карта',
        sbp: 'СБП',
        cash: 'Cash on Delivery',
    };

    const syncOrderInState = (updatedOrder) => {
        setSelectedOrder(updatedOrder);
        queryClient.setQueryData(['orders'], (previous = []) =>
            previous.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
        );
    };

    const parseApiError = (error, fallback) => {
        const details = error?.response?.data;
        if (typeof details === 'string') return details;
        return details?.detail || details?.non_field_errors?.[0] || fallback;
    };

    const cancelOrderMutation = useMutation({
        mutationFn: (orderId) => apiEndpoints.cancelOrder(orderId).then((res) => res.data),
        onSuccess: (updatedOrder) => {
            setActionError('');
            setIsEditingAddress(false);
            syncOrderInState(updatedOrder);
        },
        onError: (error) => {
            setActionError(parseApiError(error, 'Не удалось отменить заказ.'));
        },
    });

    const payOrderMutation = useMutation({
        mutationFn: (orderId) => apiEndpoints.payOrder(orderId).then((res) => res.data),
        onSuccess: (updatedOrder) => {
            setActionError('');
            syncOrderInState(updatedOrder);
        },
        onError: (error) => {
            setActionError(parseApiError(error, 'Не удалось оплатить заказ.'));
        },
    });

    const updateAddressMutation = useMutation({
        mutationFn: ({ orderId, deliveryAddress }) =>
            apiEndpoints.updateOrderDeliveryAddress(orderId, { delivery_address: deliveryAddress }).then((res) => res.data),
        onSuccess: (updatedOrder) => {
            setActionError('');
            setIsEditingAddress(false);
            syncOrderInState(updatedOrder);
        },
        onError: (error) => {
            setActionError(parseApiError(error, 'Не удалось обновить адрес доставки.'));
        },
    });

    const openOrderDetails = (order) => {
        setSelectedOrder(order);
        setNewAddress(order.delivery_address || '');
        setIsEditingAddress(false);
        setActionError('');
    };

    const closeOrderDetails = () => {
        setSelectedOrder(null);
        setIsEditingAddress(false);
        setActionError('');
    };

    const canManageOrder = isCustomerEditableOrder(selectedOrder?.status);

    if (isLoading) return <div className="p-8 text-center text-text-secondary">Загрузка заказов...</div>;

    return (
        <>
            <div className="bg-white rounded-2xl shadow-subtle p-6 animate-fade">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold">История заказов</h2>
                </div>

                <div className="space-y-3">
                    {orders?.map(order => (
                        <div key={order.id} className="flex items-center justify-between p-4 bg-[#F5F5F7] rounded-xl hover:bg-[#FAFAFA] transition">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center min-w-[80px]">
                                    {(order.items || []).slice(0, 4).map((item, index) => {
                                        const product = productsById.get(item.product);
                                        const logo = product?.image || item.product_image;

                                        return (
                                            <div
                                                key={`${order.id}-${item.product}-${index}`}
                                                className={`w-10 h-10 rounded-full border-2 border-white bg-[#F2F2F7] overflow-hidden flex items-center justify-center text-[11px] font-semibold text-text-secondary ${index > 0 ? '-ml-3' : ''}`}
                                                style={{ zIndex: 10 - index }}
                                                title={product?.name || item.product_name || `Товар #${item.product}`}
                                            >
                                                {logo ? (
                                                    <img src={logo} alt={product?.name || item.product_name || 'Товар'} className="w-full h-full object-cover" />
                                                ) : (
                                                    (product?.name?.charAt(0) || item.product_name?.charAt(0) || '•').toUpperCase()
                                                )}
                                            </div>
                                        );
                                    })}
                                    {(order.items?.length || 0) > 4 && (
                                        <div className="-ml-3 w-10 h-10 rounded-full border-2 border-white bg-white flex items-center justify-center text-[11px] font-semibold text-text-secondary">
                                            +{order.items.length - 4}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Заказ #{order.id}</div>
                                    <div className="text-xs text-text-secondary">{new Date(order.created_at).toLocaleDateString('ru-RU')} • {order.items?.length || 0} товаров</div>
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-4">
                                <div>
                                    <div className="font-bold">{order.total}₽</div>
                                    <Badge variant={statusMap[order.status]?.variant || 'default'}>
                                        {statusMap[order.status]?.label || order.status}
                                    </Badge>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => openOrderDetails(order)}>
                                    Подробнее
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between mt-6 border-t border-[#E5E5EA] pt-4">
                    <span className="text-sm text-text-secondary">Показано {orders?.length || 0} заказов</span>
                </div>
            </div>

            {selectedOrder && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={closeOrderDetails}>
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <h3 className="text-xl font-bold">Заказ #{selectedOrder.id}</h3>
                                <p className="text-sm text-text-secondary mt-1">
                                    {new Date(selectedOrder.created_at).toLocaleDateString('ru-RU')} • {selectedOrder.items?.length || 0} товаров
                                </p>
                            </div>
                            <button
                                type="button"
                                className="w-9 h-9 rounded-lg hover:bg-[#F2F2F7] transition text-lg"
                                onClick={closeOrderDetails}
                            >
                                ×
                            </button>
                        </div>

                        <div className="mb-5 p-4 rounded-xl bg-[#F5F5F7]">
                            <div className="flex flex-wrap gap-3 items-center">
                                <Badge variant={statusMap[selectedOrder.status]?.variant || 'default'}>
                                    {statusMap[selectedOrder.status]?.label || selectedOrder.status}
                                </Badge>
                                <span className="text-sm text-text-secondary">
                                    Статус: {statusMap[selectedOrder.status]?.label || selectedOrder.status}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
                                <div>
                                    <div className="text-text-secondary">Дата заказа</div>
                                    <div className="font-medium">{new Date(selectedOrder.created_at).toLocaleString('ru-RU')}</div>
                                </div>
                                <div>
                                    <div className="text-text-secondary">Примерная дата доставки</div>
                                    <div className="font-medium">
                                        {selectedOrder.estimated_delivery_date
                                            ? new Date(selectedOrder.estimated_delivery_date).toLocaleDateString('ru-RU')
                                            : '—'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {canManageOrder && (
                            <div className="mb-5 p-4 rounded-xl border border-[#FFE5A3] bg-[#FFF8E6]">
                                <div className="font-semibold text-[#B26A00] mb-1">Ожидает оплаты</div>
                                <div className="text-sm text-text-secondary">
                                    Выбранный способ оплаты: {selectedOrder.payment_method_display || paymentMethodMap[selectedOrder.payment_method] || selectedOrder.payment_method}
                                </div>
                            </div>
                        )}

                        <div className="mb-5">
                            <h4 className="font-semibold mb-3">Содержимое заказа</h4>
                            <div className="space-y-2">
                                {(selectedOrder.items || []).map((item, index) => {
                                    const product = productsById.get(item.product);
                                    const itemName = product?.name || item.product_name || `Товар #${item.product}`;
                                    return (
                                        <div key={`${selectedOrder.id}-${item.product}-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-[#F8F8FA]">
                                            <div>
                                                <div className="font-medium text-sm">{itemName}</div>
                                                <div className="text-xs text-text-secondary">Количество: {item.quantity}</div>
                                            </div>
                                            <div className="text-sm font-semibold">{item.price}₽</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-3 text-right font-bold text-lg">Итого: {selectedOrder.total}₽</div>
                        </div>

                        <div className="mb-4">
                            <h4 className="font-semibold mb-2">Адрес доставки</h4>
                            {isEditingAddress ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={newAddress}
                                        onChange={(e) => setNewAddress(e.target.value)}
                                        className="w-full min-h-20 px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition resize-none"
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                setIsEditingAddress(false);
                                                setNewAddress(selectedOrder.delivery_address || '');
                                            }}
                                        >
                                            Отмена
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => updateAddressMutation.mutate({
                                                orderId: selectedOrder.id,
                                                deliveryAddress: newAddress.trim(),
                                            })}
                                            disabled={updateAddressMutation.isPending || !newAddress.trim()}
                                        >
                                            {updateAddressMutation.isPending ? 'Сохраняем...' : 'Сохранить адрес'}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-text-secondary">{selectedOrder.delivery_address || '—'}</div>
                            )}
                        </div>

                        {actionError && (
                            <div className="mb-4 text-sm text-[#FF3B30]">{actionError}</div>
                        )}

                        <div className="flex flex-wrap gap-2 justify-end border-t border-[#E5E5EA] pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelOrderMutation.mutate(selectedOrder.id)}
                                disabled={!canManageOrder || cancelOrderMutation.isPending}
                            >
                                {cancelOrderMutation.isPending ? 'Отменяем...' : 'Отменить заказ'}
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    setActionError('');
                                    setIsEditingAddress(true);
                                }}
                                disabled={!canManageOrder || isEditingAddress}
                            >
                                Изменить адрес доставки
                            </Button>
                            {canManageOrder && (
                                <Button
                                    size="sm"
                                    onClick={() => payOrderMutation.mutate(selectedOrder.id)}
                                    disabled={payOrderMutation.isPending}
                                >
                                    {payOrderMutation.isPending ? 'Оплачиваем...' : 'Оплатить'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Stores tab.
function StoresContent({ navigate }) {
    const { data: stores, isLoading } = useQuery({
        queryKey: ['my-stores'],
        queryFn: () => apiEndpoints.getMyStores().then(res => res.data),
    });

    const userStores = stores || [];

    return (
        <div className="animate-fade">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Мои магазины</h2>
            </div>

            {isLoading ? (
                <div className="text-center py-10 text-text-secondary">Загрузка магазинов...</div>
            ) : userStores.length === 0 ? (
                <EmptyState
                    title="У вас пока нет магазинов"
                    description="Создайте свой первый магазин и начните продавать!"
                    icon="box"
                    actionLabel="Создать магазин"
                    onAction={() => navigate('/create-store')}
                />
            ) : (
                <div className="grid grid-cols-2 gap-5">
                    {userStores.map(store => (
                        <div key={store.id} className="bg-white rounded-2xl shadow-subtle overflow-hidden hover:shadow-card transition-all duration-300 cursor-pointer group hover:-translate-y-1">
                            <div className="h-24" style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' }} />
                            <div className="p-5 -mt-8 relative">
                                <div className="w-16 h-16 rounded-2xl bg-white shadow-lg border-4 border-white flex items-center justify-center font-bold text-xl text-[#007AFF] mb-3 overflow-hidden">
                                    {store.logo ? (
                                        <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                                    ) : (
                                        store.name?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex items-center justify-between gap-3 mb-1">
                                    <h3 className="font-bold text-lg">{store.name}</h3>
                                    <Badge variant={STORE_STATUS_MAP[store.status]?.variant || 'default'}>
                                        {STORE_STATUS_MAP[store.status]?.label || store.status}
                                    </Badge>
                                </div>
                                <p className="text-xs text-text-secondary mb-3 line-clamp-2">{store.description}</p>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); navigate(`/store/${store.id}`); }}>Открыть</Button>
                                    <Button variant="secondary" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); navigate(`/create-store/${store.id}`); }}>Редактировать</Button>
                                    <Button size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); navigate('/create-product'); }}>Добавить товар</Button>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div onClick={() => navigate('/create-store')} className="bg-white rounded-2xl shadow-subtle border-2 border-dashed border-[#D1D1D6] flex flex-col items-center justify-center cursor-pointer hover:border-[#007AFF] hover:bg-[#007AFF]/5 transition p-8 min-h-[200px]">
                        <div className="w-14 h-14 rounded-full bg-[#F2F2F7] flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-[#007AFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <span className="font-medium text-[#007AFF] text-sm">Добавить новый магазин</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// Favorites tab.
function FavoritesContent() {
    const { items: wishlistItems, isLoading, removeFromWishlist } = useWishlist();
    const { items: cartItems, addToCart } = useCart();
    const navigate = useNavigate();

    const isInCart = (productId) => cartItems.some(item => item.id === productId);

    const handleCardClick = (productId) => {
        navigate(`/product/${productId}`);
    };

    const handleRemove = (e, itemId) => {
        e.preventDefault();
        e.stopPropagation();
        removeFromWishlist(itemId);
    };

    const handleCartAction = (e, product) => {
        e.stopPropagation();
        if (isInCart(product.id)) {
            navigate('/cart');
        } else {
            addToCart(product);
        }
    };

    if (isLoading) {
        return <div className="text-center py-10 text-text-secondary">Загрузка...</div>;
    }

    if (wishlistItems.length === 0) {
        return (
            <EmptyState
                title="Избранное пусто"
                description="Добавляйте товары в избранное, чтобы не потерять их!"
                icon="heart"
                actionLabel="Перейти в каталог"
            />
        );
    }

    return (
        <div className="animate-fade">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Избранное</h2>
            </div>

            <div className="grid grid-cols-4 gap-6">
                {wishlistItems.map((item) => {
                    const product = item.product;
                    if (!product) return null;

                    const inCart = isInCart(product.id);
                    const addedDate = new Date(item.added_at);
                    const formattedDate = addedDate.toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    });

                    return (
                        <div
                            key={item.id}
                            onClick={() => handleCardClick(product.id)}
                            className="bg-white rounded-2xl shadow-subtle overflow-hidden hover:shadow-card transition cursor-pointer group"
                        >
                            <div className="h-48 product-img relative">
                                <button
                                    className="absolute top-3 right-3 w-9 h-9 bg-[#FF3B30] rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition shadow-md opacity-0 group-hover:opacity-100"
                                    onClick={(e) => handleRemove(e, item.id)}
                                    title="Удалить из избранного"
                                >
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25c0-2.485 2.099-4.5 4.688-4.5 1.935 0 3.597 1.126 4.312 2.733.715-1.607 2.377-2.733 4.313-2.733 2.589 0 4.688 2.015 4.688 4.5 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-sm mb-1 truncate">{product.name}</h3>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[#007AFF] font-bold">{product.price}₽</span>
                                    {product.old_price && <span className="text-xs text-text-secondary line-through">{product.old_price}₽</span>}
                                </div>
                                <p className="text-xs text-text-secondary mb-3">{formattedDate}</p>
                                <button
                                    className={`w-full py-2 rounded-lg text-sm font-medium transition ${inCart
                                            ? 'bg-[#34C759] text-white hover:bg-[#2DA84A]'
                                            : 'bg-[#F2F2F7] text-text-primary hover:bg-[#E5E5EA]'
                                        }`}
                                    onClick={(e) => handleCartAction(e, product)}
                                >
                                    {inCart ? 'В корзине' : 'Добавить в корзину'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Settings tab.
function SettingsContent() {
    const { data: user, isLoading, refetch } = useQuery({
        queryKey: ['user'],
        queryFn: () => apiEndpoints.me().then(res => res.data),
    });

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
    });

    const [isSaving, setIsSaving] = useState(false);
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                phone: user.phone || '',
            });
        }
    }, [user]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiEndpoints.updateUser(formData);
            await refetch();
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2500);
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Не удалось сохранить изменения');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl shadow-subtle p-6 animate-fade max-w-2xl">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-[#E5E5EA] rounded w-48"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-12 bg-[#E5E5EA] rounded"></div>
                        <div className="h-12 bg-[#E5E5EA] rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-subtle p-6 animate-fade max-w-2xl relative">
            {showToast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-down">
                    <div className="bg-[#1C1C1E] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-[#34C759] flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <span className="text-sm font-medium">Изменения сохранены</span>
                    </div>
                </div>
            )}

            <h2 className="text-lg font-bold mb-6">Настройки профиля</h2>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Имя</label>
                        <input
                            type="text"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition"
                            placeholder="Введите имя"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Фамилия</label>
                        <input
                            type="text"
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition"
                            placeholder="Введите фамилию"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition"
                        placeholder="email@example.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Телефон</label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition"
                        placeholder="+7 900 123 45 67"
                    />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                    <Button variant="secondary" onClick={() => refetch()}>Отмена</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                    </Button>
                </div>
            </div>
        </div>
    );
}