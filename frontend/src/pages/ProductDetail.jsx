import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);

  const { addToCart, items: cartItems } = useCart();
  const { toggle: toggleWishlist, isInWishlist } = useWishlist();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => apiEndpoints.getProduct(id).then(res => res.data),
  });

  // Проверяем, есть ли товар в корзине
  const cartItem = cartItems.find(item => item.id === product?.id);
  const isInCart = !!cartItem;
  const cartQuantity = cartItem?.quantity || 0;

  const handleAddToCart = () => {
    if (!product) return;
    
    if (isInCart) {
      // Если уже в корзине - переходим в корзину
      navigate('/cart');
    } else {
      // Добавляем с выбранным количеством
      addToCart({ ...product, quantity });
    }
  };

  const handleQuantityChange = (delta) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.stock_quantity || 999)) {
      setQuantity(newQuantity);
    }
  };

  if (isLoading) return (
    <div className="max-w-[1440px] mx-auto px-6 py-20 text-center">
      <div className="animate-pulse">
        <div className="h-8 bg-[#E5E5EA] rounded w-48 mx-auto mb-4"></div>
        <div className="h-96 bg-[#E5E5EA] rounded-2xl mb-6"></div>
      </div>
    </div>
  );

  if (!product) return (
    <div className="max-w-[1440px] mx-auto px-6 py-20 text-center">
      <h2 className="text-2xl font-bold text-text-secondary mb-4">Товар не найден</h2>
      <Button onClick={() => navigate('/catalog')}>Перейти в каталог</Button>
    </div>
  );

  const discount = product.old_price 
    ? Math.round(((product.old_price - product.price) / product.old_price) * 100) 
    : 0;

  const inWishlist = isInWishlist(product.id);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      {/* Навигация */}
      <div className="flex items-center gap-2 text-sm text-text-secondary mb-6">
        <button onClick={() => navigate(-1)} className="hover:text-text-primary transition">
          ← Назад
        </button>
        <span>/</span>
        <button onClick={() => navigate('/catalog')} className="hover:text-text-primary transition">
          Каталог
        </button>
        {product.category && (
          <>
            <span>/</span>
            <button className="hover:text-text-primary transition">
              {product.category.name}
            </button>
          </>
        )}
      </div>

      <div className="flex gap-8">
        {/* Галерея изображений */}
        <div className="flex-1 space-y-4">
          <div className="h-[500px] bg-white rounded-2xl shadow-subtle overflow-hidden">
            {product.image ? (
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#f0f4ff] to-[#e8f0ff] flex items-center justify-center text-text-secondary">
                <div className="text-center">
                  <svg className="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg">Нет фото</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Миниатюры (заглушки для будущих фото) */}
          <div className="grid grid-cols-4 gap-3">
            <div className="h-24 bg-white rounded-xl shadow-subtle cursor-pointer ring-2 ring-[#007AFF] overflow-hidden">
              {product.image && <img src={product.image} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="h-24 bg-[#F2F2F7] rounded-xl"></div>
            <div className="h-24 bg-[#F2F2F7] rounded-xl"></div>
            <div className="h-24 bg-[#F2F2F7] rounded-xl"></div>
          </div>
        </div>

        {/* Информация о товаре */}
        <div className="w-[450px]">
          <div className="bg-white rounded-2xl shadow-subtle p-6 sticky top-24 space-y-6">
            {/* Категория и бейджи */}
            <div className="flex items-start justify-between">
              <Badge variant="info">{product.category?.name || 'Категория'}</Badge>
              {discount > 0 && (
                <Badge variant="error">-{discount}%</Badge>
              )}
            </div>

            {/* Название */}
            <div>
              <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
              {product.brand && (
                <p className="text-sm text-text-secondary">Бренд: {product.brand}</p>
              )}
            </div>

            {/* Рейтинг */}
            <div className="flex items-center gap-3">
              <div className="flex text-[#FF9500] text-sm">★★★★★</div>
              <span className="text-sm font-medium">{product.rating || '4.8'}</span>
              <span className="text-sm text-text-secondary">
                ({product.review_count || 2456} отзывов)
              </span>
              {product.stock_quantity > 0 ? (
                <span className="text-sm text-[#34C759] font-medium ml-auto">
                  ✓ В наличии ({product.stock_quantity} шт.)
                </span>
              ) : (
                <span className="text-sm text-[#FF3B30] font-medium ml-auto">
                  Нет в наличии
                </span>
              )}
            </div>

            {/* Цена */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-[#007AFF]">
                ${parseFloat(product.price).toFixed(2)}
              </span>
              {product.old_price && (
                <span className="text-xl text-text-secondary line-through">
                  ${parseFloat(product.old_price).toFixed(2)}
                </span>
              )}
            </div>

            {/* Описание */}
            {product.description && (
              <div className="border-t border-[#F2F2F7] pt-4">
                <h3 className="font-semibold mb-2">Описание</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Выбор количества */}
            <div className="border-t border-[#F2F2F7] pt-4">
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Количество
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-[#F2F2F7] rounded-xl p-1">
                  <button 
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-lg hover:bg-[#E5E5EA] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    −
                  </button>
                  <span className="w-12 text-center font-semibold text-lg">{quantity}</span>
                  <button 
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= (product.stock_quantity || 999)}
                    className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-lg hover:bg-[#E5E5EA] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
                {quantity > 1 && (
                  <span className="text-sm text-text-secondary">
                    Итого: <span className="font-bold text-[#007AFF]">
                      ${(product.price * quantity).toFixed(2)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={product.stock_quantity === 0}
                className={`flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  isInCart
                    ? 'bg-[#34C759] text-white hover:bg-[#2DA84A]'
                    : 'bg-[#007AFF] text-white hover:bg-[#0066CC]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isInCart ? (
                  <>
                    <span>✓ В корзине ({cartQuantity})</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>В корзину</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </>
                )}
              </button>
              
              <button
                onClick={() => toggleWishlist(product)}
                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${
                  inWishlist
                    ? 'border-[#FF3B30] bg-[#FF3B30] text-white'
                    : 'border-[#E5E5EA] text-text-secondary hover:border-[#FF3B30] hover:text-[#FF3B30]'
                }`}
              >
                <svg className="w-6 h-6" fill={inWishlist ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>

            {/* Дополнительная информация */}
            <div className="border-t border-[#F2F2F7] pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Артикул:</span>
                <span className="font-medium">{product.sku || `PRD-${product.id}`}</span>
              </div>
              {product.brand && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Бренд:</span>
                  <span className="font-medium">{product.brand}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">Доставка:</span>
                <span className="font-medium text-[#34C759]">Бесплатно от $50</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Характеристики (если есть) */}
      <div className="mt-12 bg-white rounded-2xl shadow-subtle p-8">
        <h2 className="text-xl font-bold mb-6">Характеристики</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex justify-between py-3 border-b border-[#F2F2F7]">
            <span className="text-text-secondary">Категория</span>
            <span className="font-medium">{product.category?.name || '—'}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-[#F2F2F7]">
            <span className="text-text-secondary">Наличие</span>
            <span className="font-medium text-[#34C759]">В наличии</span>
          </div>
          <div className="flex justify-between py-3 border-b border-[#F2F2F7]">
            <span className="text-text-secondary">Рейтинг</span>
            <span className="font-medium">{product.rating || '4.8'} / 5.0</span>
          </div>
          <div className="flex justify-between py-3 border-b border-[#F2F2F7]">
            <span className="text-text-secondary">Отзывов</span>
            <span className="font-medium">{product.review_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Похожие товары (заглушка) */}
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-6">Похожие товары</h2>
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-subtle p-4">
              <div className="h-40 bg-[#F2F2F7] rounded-xl mb-3"></div>
              <div className="h-4 bg-[#F2F2F7] rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-[#F2F2F7] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}