import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../../hooks/useWishlist';

export default function ProductCard({ product, isOwner = false }) {
    const navigate = useNavigate();
    const { toggle, isInWishlist } = useWishlist();
    const liked = isInWishlist(product.id);
    const discount = product.old_price ? Math.round(((product.old_price - product.price) / product.old_price) * 100) : 0;

    // 1. Клик по карточке — ВСЕГДА ведет на просмотр товара
    // (чтобы не было конфликтов и случайных переходов в редактор)
    const handleCardClick = () => {
        navigate(`/product/${product.id}`);
    };

    // 2. Клик по кнопке редактирования — ведет в редактор
    // (доступно только владельцу)
    const handleEditClick = (e) => {
        e.stopPropagation(); // Останавливаем всплытие, чтобы не сработал клик по карточке
        navigate(`/create-product/${product.id}`);
    };

    // 3. Клик по лайку
    const handleLikeClick = (e) => {
        e.stopPropagation();
        toggle(product);
    };

    return (
        <div 
            onClick={handleCardClick}
            className="bg-white rounded-2xl shadow-subtle overflow-hidden hover:shadow-card transition-all duration-300 cursor-pointer group hover:-translate-y-1 relative"
        >
            <div className="h-52 relative bg-[#F2F2F7] overflow-hidden">
                {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> 
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#f0f4ff] to-[#e8f0ff]" />
                )}
                
                {/* Кнопка редактирования (только для владельца) */}
                {isOwner && (
                    <button 
                        className="absolute top-3 left-3 w-9 h-9 bg-[#007AFF] rounded-full flex items-center justify-center hover:scale-110 transition shadow-md z-20"
                        onClick={handleEditClick}
                        title="Редактировать товар"
                        type="button"
                    >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                )}
                
                {/* Кнопка лайка */}
                <button 
                    className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 z-20 ${
                        liked 
                            ? 'bg-[#FF3B30] opacity-100 shadow-md' 
                            : 'bg-white/80 backdrop-blur opacity-0 group-hover:opacity-100 hover:bg-white'
                    }`}
                    onClick={handleLikeClick}
                    type="button"
                >
                    <svg 
                        className={`w-5 h-5 ${liked ? 'text-white' : 'text-text-secondary hover:text-[#FF3B30]'}`} 
                        fill={liked ? "currentColor" : "none"} 
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
            
            <div className="p-4">
                <h3 className="font-semibold text-sm mb-1 truncate">{product.name}</h3>
                
                {product.category_name && (
                    <p className="text-xs text-text-secondary mb-2">{product.category_name}</p>
                )}
                
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-[#007AFF] font-bold">${product.price}</span>
                    {product.old_price && (
                        <span className="text-xs text-text-secondary line-through">${product.old_price}</span>
                    )}
                    {discount > 0 && (
                        <span className="text-[10px] font-bold text-[#FF3B30] bg-[#FF3B30]/10 px-1.5 py-0.5 rounded-md">-{discount}%</span>
                    )}
                </div>
                
                {product.rating && (
                    <div className="flex items-center gap-1">
                        <div className="flex text-[#FF9500] text-xs">★★★★★</div>
                        <span className="text-xs text-text-secondary">({product.review_count || 0})</span>
                    </div>
                )}
            </div>
        </div>
    );
}