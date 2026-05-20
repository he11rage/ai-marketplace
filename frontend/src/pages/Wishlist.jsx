import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../hooks/useCart';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

export default function Wishlist() {
    const navigate = useNavigate();
    const { items, isLoading, removeFromWishlist } = useWishlist();
    const { items: cartItems, addToCart } = useCart();

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

    return (
        <div className="max-w-[1440px] mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Избранное</h1>
                <div className="flex gap-3">
                    <select className="px-3 py-2 rounded-xl bg-white border border-[#E5E5EA] text-sm">
                        <option>По дате добавления</option>
                        <option>По цене</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-6">
                {isLoading ? (
                    <p className="text-text-secondary col-span-4 text-center py-10">Загрузка...</p>
                ) : (
                    items.map((item) => {
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
                                className="bg-white rounded-2xl shadow-subtle overflow-hidden hover:shadow-card transition-all duration-300 cursor-pointer group"
                            >
                                <div className="h-52 relative bg-[#F2F2F7] overflow-hidden">
                                    {product.image ? (
                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-[#f0f4ff] to-[#e8f0ff]" />
                                    )}

                                    <button
                                        className="absolute top-3 right-3 w-9 h-9 bg-[#FF3B30] rounded-full flex items-center justify-center hover:scale-110 transition shadow-md cursor-pointer opacity-0 group-hover:opacity-100"
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
                                        {product.old_price && (
                                            <span className="text-xs text-text-secondary line-through">{product.old_price}₽</span>
                                        )}
                                    </div>

                                    <p className="text-xs text-text-secondary mb-3">{formattedDate}</p>

                                    <button
                                        className={`w-full py-2 rounded-lg text-sm font-medium transition ${
                                            inCart 
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
                    })
                )}
            </div>
        </div>
    );
}