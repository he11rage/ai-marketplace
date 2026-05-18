import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../hooks/useCart';

export default function Account() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');

    // Загрузка данных пользователя
    const { data: user, isLoading: userLoading } = useQuery({
        queryKey: ['user'],
        queryFn: () => apiEndpoints.me().then(res => res.data),
        enabled: !!token,
    });

    // 🔴 Функция выхода из аккаунта
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

    // Формируем инициалы или первую букву логина
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

    // Формируем отображаемое имя
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

                {/* 🔴 Кнопка выхода внизу */}
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
                {activeTab === 'stores' && <StoresContent navigate={navigate} user={user} />}
                {activeTab === 'favorites' && <FavoritesContent />}
                {activeTab === 'settings' && <SettingsContent />}
            </main>
        </div>
    );
}

// --- Вкладка: Обзор ---
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

    const userProducts = products?.filter(product =>
        userStores.some(store => store.id === product.store)
    ) || [];

    const totalRevenue = orders
        ?.filter(order => order.status === 'delivered')
        .reduce((sum, order) => sum + parseFloat(order.total || 0), 0) || 0;

    const lowStockProducts = userProducts.filter(p => (p.stock_quantity || 0) < 5).length;

    const statusMap = {
        delivered: { label: 'Доставлен', variant: 'success' },
        processing: { label: 'В обработке', variant: 'info' },
        pending: { label: 'Ожидает', variant: 'warning' },
        cancelled: { label: 'Отменён', variant: 'error' },
    };

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
                    <div className="text-2xl font-bold">{userStores.length}</div>
                </div>
                <div className="bg-white rounded-xl shadow-subtle p-5">
                    <div className="text-sm text-text-secondary mb-1">Доход</div>
                    <div className="text-2xl font-bold">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                    <div className="text-xs text-[#34C759] mt-1">+8% за неделю</div>
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
                                        <td className="py-3 font-medium">${order.total}</td>
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

// --- Вкладка: Заказы ---
function OrdersContent() {
    const { data: orders, isLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: () => apiEndpoints.getOrders().then(res => res.data),
    });

    const statusMap = {
        delivered: { label: 'Доставлен', variant: 'success' },
        processing: { label: 'В обработке', variant: 'info' },
        pending: { label: 'Ожидает оплаты', variant: 'warning' },
        cancelled: { label: 'Отменён', variant: 'error' },
    };

    if (isLoading) return <div className="p-8 text-center text-text-secondary">Загрузка заказов...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-subtle p-6 animate-fade">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">История заказов</h2>
                <div className="flex gap-2">
                    <input type="text" placeholder="Поиск по номеру..." className="px-4 py-2 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm" />
                    <select className="px-3 py-2 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm">
                        <option>Все статусы</option>
                        <option>Доставлен</option>
                        <option>В обработке</option>
                    </select>
                </div>
            </div>

            <div className="space-y-3">
                {orders?.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-[#F5F5F7] rounded-xl hover:bg-[#FAFAFA] transition">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 product-img rounded-lg" />
                            <div>
                                <div className="font-medium text-sm">Заказ #{order.id}</div>
                                <div className="text-xs text-text-secondary">{new Date(order.created_at).toLocaleDateString('ru-RU')} • {order.items?.length || 0} товаров</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold">${order.total}</div>
                            <Badge variant={statusMap[order.status]?.variant || 'default'}>
                                {statusMap[order.status]?.label || order.status}
                            </Badge>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between mt-6 border-t border-[#E5E5EA] pt-4">
                <span className="text-sm text-text-secondary">Показано {orders?.length || 0} заказов</span>
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 rounded-lg border border-[#E5E5EA] text-sm hover:bg-[#F2F2F7]">← Назад</button>
                    <button className="px-3 py-1.5 rounded-lg bg-[#007AFF] text-white text-sm">1</button>
                    <button className="px-3 py-1.5 rounded-lg border border-[#E5E5EA] text-sm hover:bg-[#F2F2F7]">2</button>
                    <button className="px-3 py-1.5 rounded-lg border border-[#E5E5EA] text-sm hover:bg-[#F2F2F7]">Далее →</button>
                </div>
            </div>
        </div>
    );
}

// --- Вкладка: Магазины ---
function StoresContent({ navigate, user }) {
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
                                <h3 className="font-bold text-lg mb-1">{store.name}</h3>
                                <p className="text-xs text-text-secondary mb-3">{store.slug}.marketflow.ru</p>
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

// --- Вкладка: Избранное ---
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
                                    <span className="text-[#007AFF] font-bold">${product.price}</span>
                                    {product.old_price && <span className="text-xs text-text-secondary line-through">${product.old_price}</span>}
                                </div>
                                <p className="text-xs text-text-secondary mb-3">{formattedDate}</p>
                                <button
                                    className={`w-full py-2 rounded-lg text-sm font-medium transition ${inCart
                                            ? 'bg-[#34C759] text-white hover:bg-[#2DA84A]'
                                            : 'bg-[#F2F2F7] text-text-primary hover:bg-[#E5E5EA]'
                                        }`}
                                    onClick={(e) => handleCartAction(e, product)}
                                >
                                    {inCart ? '✓ В корзине' : 'В корзину'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// --- Вкладка: Настройки ---
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