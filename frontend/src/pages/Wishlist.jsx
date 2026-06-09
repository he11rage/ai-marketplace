import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../hooks/useCart';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

export default function Wishlist() {
    const navigate = useNavigate();
    const { items, isLoading, removeFromWishlist } = useWishlist();
    const { items: cartItems, addToCart } = useCart();
    
    // Состояние для хранения выбранной сортировки
    const [sortBy, setSortBy] = useState('date_desc'); 

    const isInCart = (productId) => cartItems.some(item => item.id === productId);

    const handleCardClick = (productId) => {
        navigate(`/product/${productId}`);
    };

    // Корректное удаление элемента из избранного
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

    // Логика сортировки на фронтенде
    const getSortedItems = () => {
        if (!items) return [];
        
        return [...items].sort((a, b) => {
            const priceA = a.product?.price || 0;
            const priceB = b.product?.price || 0;
            
            switch (sortBy) {
                case 'price_asc': // Сначала дешевле
                    return priceA - priceB;
                case 'price_desc': // Сначала дороже
                    return priceB - priceA;
                case 'date_desc': // Сначала новые
                default:
                    return new Date(b.added_at) - new Date(a.added_at);
            }
        });
    };

    if (!isLoading && items.length === 0) {
        return (
            <div className="max-w-[1440px] mx-auto px-6 py-12">
                <EmptyState
                    title="Ваше избранное пусто"
                    description="Добавляйте товары в избранное, чтобы не потерять их!"
                    icon="heart"
                />
            </div>
        );
    }

    const sortedItems = getSortedItems();

    return (
        <div className="max-w-[1440px] mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Избранное</h1>
                <div className="flex gap-3">
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white border border-[#E5E5EA] text-sm focus:outline-none cursor-pointer font-medium text-gray-700 shadow-sm"
                    >
                        <option value="date_desc">По дате добавления</option>
                        <option value="price_asc">По цене: сначала дешевле</option>
                        <option value="price_desc">По цене: сначала дороже</option>
                    </select>
                </div>
            </div>

            {/* Сетка карточек товаров */}
            <div className="grid grid-cols-4 gap-6">
                {isLoading ? (
                    <p className="text-text-secondary col-span-4 text-center py-10">Загрузка...</p>
                ) : (
                    sortedItems.map((item) => {
                        const product = item.product;
                        if (!product) return null;

                        const inCart = isInCart(product.id);
                        const discount = product.old_price
                            ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
                            : 0;

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
                                className="bg-white rounded-2xl shadow-subtle overflow-hidden hover:shadow-card transition-all duration-300 cursor-pointer group hover:-translate-y-1 relative flex flex-col h-full"
                            >
                                {/* Блок изображения: Клон разметки из ProductCard */}
                                <div className="w-full aspect-[3/4] relative bg-white overflow-hidden shrink-0 border-b border-gray-100">
                                    {product.image ? (
                                        <img 
                                            src={product.image} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" 
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-[#f0f4ff] to-[#e8f0ff]" />
                                    )}

                                    {/* Плашка скидки в стиле ProductCard */}
                                    {discount > 0 && (
                                        <div className="absolute top-3 left-3 px-1.5 py-0.5 rounded-md bg-[#FF3B30] text-white text-[10px] font-bold shadow-sm">
                                            -{discount}%
                                        </div>
                                    )}

                                    {/* Точная копия кнопки-сердечка из ProductCard с логикой удаления */}
                                    <button 
                                        className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 z-20 bg-[#FF3B30] opacity-100 shadow-md"
                                        onClick={(e) => handleRemove(e, item.id)}
                                        type="button"
                                        title="Удалить из избранного"
                                    >
                                        <svg 
                                            className="w-5 h-5 text-white" 
                                            fill="currentColor" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round" 
                                                strokeWidth="1.5" 
                                                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                                            />
                                        </svg>
                                    </button>
                                </div>

                                {/* Текстовый контент */}
                                <div className="p-3.5 flex flex-col flex-grow">
                                    <h3 className="font-medium text-sm text-gray-800 mb-1.5 line-clamp-2 h-10 leading-5 overflow-hidden" title={product.name}>
                                        {product.name}
                                    </h3>
                                    
                                    <div className="mt-auto">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[#007AFF] font-bold text-base">{product.price}₽</span>
                                            {product.old_price && (
                                                <span className="text-xs text-gray-400 line-through">{product.old_price}₽</span>
                                            )}
                                        </div>

                                        <p className="text-[11px] text-gray-400 mb-3 font-medium">Добавлено: {formattedDate}</p>

                                        {/* Кнопка Корзины */}
                                        <button
                                            className={`w-full py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                                                inCart 
                                                    ? 'bg-[#34C759] text-white hover:bg-[#2DA84A]' 
                                                    : 'bg-[#F2F2F7] text-gray-800 hover:bg-[#E5E5EA]'
                                            }`}
                                            onClick={(e) => handleCartAction(e, product)}
                                            type="button"
                                        >
                                            {inCart ? 'В корзине' : 'Добавить в корзину'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
