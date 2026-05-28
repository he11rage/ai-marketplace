import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProductCard from '../components/ui/ProductCard';
import ProductQuestions from '../components/ProductQuestions';

function renderStars(ratingValue) {
  const raw = Number(ratingValue);
  const rating = Number.isFinite(raw) ? raw : 0;
  const clamped = Math.max(0, Math.min(5, rating));
  const roundedToHalf = Math.round(clamped * 2) / 2;
  const full = Math.floor(roundedToHalf);
  const hasHalf = roundedToHalf - full === 0.5;
  return '⭐️'.repeat(full) + (hasHalf ? '½' : '');
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reportTarget, setReportTarget] = useState(null); // { type, id }
  const [reportReason, setReportReason] = useState('Спам/мошенничество');
  const [reportDescription, setReportDescription] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');

  const { addToCart, items: cartItems } = useCart();
  const { toggle: toggleWishlist, isInWishlist } = useWishlist();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => apiEndpoints.getProduct(id).then(res => res.data),
  });

  const { data: reviews = [], isLoading: isReviewsLoading, refetch: refetchReviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => apiEndpoints.getReviews({ product: id }).then((res) => res.data || []),
    enabled: Boolean(id),
  });

  const reviewsCount = reviews.length;
  const averageFromReviews = useMemo(() => {
    if (!reviewsCount) return null;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return Math.round((sum / reviewsCount) * 10) / 10;
  }, [reviews, reviewsCount]);

  const productCategoryId = typeof product?.category === 'object'
    ? product.category?.id
    : product?.category;

  const { data: relatedProducts = [], isLoading: isRelatedLoading } = useQuery({
    queryKey: ['related-products', id, productCategoryId],
    queryFn: () =>
      apiEndpoints
        .getProducts({ category: productCategoryId, ordering: 'relevance' })
        .then((res) => (res.data || []).filter((item) => item.id !== Number(id))),
    enabled: Boolean(productCategoryId && id),
  });
  const RELATED_PRODUCTS_PREVIEW_LIMIT = 4;
  const visibleRelatedProducts = relatedProducts.slice(0, RELATED_PRODUCTS_PREVIEW_LIMIT);
  const hasMoreRelatedProducts = relatedProducts.length > RELATED_PRODUCTS_PREVIEW_LIMIT;

  // Check whether product already exists in cart.
  const cartItem = cartItems.find(item => item.id === product?.id);
  const isInCart = !!cartItem;
  const cartQuantity = cartItem?.quantity || 0;

  const handleAddToCart = () => {
    if (!product) return;
    
    if (isInCart) {
      // If already in cart, open cart page.
      navigate('/cart');
    } else {
      // Add product with selected quantity.
      addToCart({ ...product, quantity });
    }
  };

  const handleQuantityChange = (delta) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.stock_quantity || 999)) {
      setQuantity(newQuantity);
    }
  };

  const handleSubmitReview = async () => {
    setReviewError('');
    setReviewSuccess('');
    try {
      await apiEndpoints.createReview({
        product: Number(id),
        rating: Number(reviewRating),
        text: reviewText,
      });
      setReviewSuccess('Отзыв отправлен.');
      setReviewText('');
      setReviewRating(5);
      await refetchReviews();
    } catch (e) {
      const msg =
        e?.response?.data?.product?.[0] ||
        e?.response?.data?.detail ||
        'Не удалось отправить отзыв.';
      setReviewError(msg);
    }
  };

  const handleSubmitReport = async () => {
    setReportError('');
    setReportSuccess('');
    try {
      if (!reportTarget) return;
      const payload = {
        target_type: reportTarget.type,
        reason: reportReason,
        description: reportDescription,
      };
      if (reportTarget.type === 'product') payload.product = Number(reportTarget.id);
      if (reportTarget.type === 'review') payload.review = Number(reportTarget.id);
      await apiEndpoints.createReport(payload);
      setReportSuccess('Жалоба отправлена.');
      setReportDescription('');
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Не удалось отправить жалобу.';
      setReportError(msg);
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
  const categoryName = product.category_name || product.category?.name || '';
  const productRatingValue = Number(product.rating ?? 0) || 0;
  const productRatingText = productRatingValue.toFixed(1);
  const productReviewCount = Number(product.review_count ?? reviewsCount) || 0;

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      {/* Breadcrumbs */}
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
        {/* Image gallery */}
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
          
          {/* Thumbnail placeholders */}
          <div className="grid grid-cols-4 gap-3">
            <div className="h-24 bg-white rounded-xl shadow-subtle cursor-pointer ring-2 ring-[#007AFF] overflow-hidden">
              {product.image && <img src={product.image} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="h-24 bg-[#F2F2F7] rounded-xl"></div>
            <div className="h-24 bg-[#F2F2F7] rounded-xl"></div>
            <div className="h-24 bg-[#F2F2F7] rounded-xl"></div>
          </div>
        </div>

        {/* Product details */}
        <div className="w-[450px]">
          <div className="bg-white rounded-2xl shadow-subtle p-6 sticky top-24 space-y-6">
            {/* Category and badges */}
            <div className="flex items-start justify-between">
              <Badge variant="info">{categoryName || 'Без категории'}</Badge>
              {discount > 0 && (
                <Badge variant="error">-{discount}%</Badge>
              )}
            </div>

            {/* Product title */}
            <div>
              <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
              {product.brand && (
                <p className="text-sm text-text-secondary">Бренд: {product.brand}</p>
              )}
            </div>

            {/* Rating section */}
            <div className="flex items-center gap-3">
              <div className="flex text-[#FF9500] text-sm">
                {renderStars(productRatingValue)}
              </div>
              <span className="text-sm font-medium">{productRatingText}</span>
              <span className="text-sm text-text-secondary">
                ({productReviewCount} отзывов)
              </span>
              {product.stock_quantity > 0 ? (
                <span className="text-sm text-[#34C759] font-medium ml-auto">
                  В наличии ({product.stock_quantity} шт.)
                </span>
              ) : (
                <span className="text-sm text-[#FF3B30] font-medium ml-auto">
                  Нет в наличии
                </span>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-[#007AFF]">
                {parseFloat(product.price).toFixed(2)}₽
              </span>
              {product.old_price && (
                <span className="text-xl text-text-secondary line-through">
                  {parseFloat(product.old_price).toFixed(2)}₽
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="border-t border-[#F2F2F7] pt-4">
                <h3 className="font-semibold mb-2">Описание</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Quantity selector */}
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
                      {(product.price * quantity).toFixed(2)}₽
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
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
                {product.stock_quantity === 0 ? (
                  <span>Нет в наличии</span>
                ) : isInCart ? (
                  <>
                    <span>В корзине ({cartQuantity})</span>
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

            {/* Additional information */}
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
                <span className="font-medium text-[#34C759]">Бесплатно от 50₽</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications */}
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
            <span className="font-medium">{productRatingText} / 5.0</span>
          </div>
          <div className="flex justify-between py-3 border-b border-[#F2F2F7]">
            <span className="text-text-secondary">Отзывов</span>
            <span className="font-medium">{productReviewCount}</span>
          </div>
        </div>
      </div>

      <ProductQuestions
        productId={id}
        storeId={typeof product?.store === 'object' ? product.store?.id : product?.store}
      />

      {/* Reviews */}
      <div className="mt-12 bg-white rounded-2xl shadow-subtle p-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold">Отзывы</h2>
          <div className="text-sm text-text-secondary">
            Средняя оценка: <span className="font-semibold text-text-primary">
              {productRatingText}
            </span> · {productReviewCount} шт.
          </div>
        </div>

        <div className="mb-6 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setReportTarget({ type: 'product', id })}
            className="text-sm text-[#FF3B30] hover:underline"
          >
            Пожаловаться на товар
          </button>
        </div>

        <div className="border border-[#F2F2F7] rounded-2xl p-5 mb-8">
          <h3 className="font-semibold mb-4">Оставить отзыв</h3>
          {reviewError && (
            <div className="mb-4 text-sm text-[#FF3B30]">{reviewError}</div>
          )}
          {reviewSuccess && (
            <div className="mb-4 text-sm text-[#34C759]">{reviewSuccess}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-sm font-medium text-text-secondary mb-2">Оценка</div>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(e.target.value)}
                className="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 outline-none"
              >
                {[5, 4, 3, 2, 1].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>

            <label className="block md:col-span-2">
              <div className="text-sm font-medium text-text-secondary mb-2">Текст</div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
                className="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 outline-none resize-none"
                placeholder="Напишите впечатления о товаре"
              />
            </label>
          </div>

          <div className="mt-4">
            <Button onClick={handleSubmitReview}>Отправить</Button>
            <div className="mt-2 text-xs text-text-secondary">
              Отзыв можно оставить только после успешной покупки (проверяется на сервере).
            </div>
          </div>
        </div>

        {isReviewsLoading ? (
          <div className="text-text-secondary">Загрузка отзывов…</div>
        ) : reviews.length === 0 ? (
          <div className="text-text-secondary">Пока нет отзывов.</div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="border border-[#F2F2F7] rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-semibold">{r.author_username || 'Покупатель'}</div>
                  <div className="flex items-center gap-3">
                    {r.status === 'pending_moderation' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-[#F2F2F7] text-text-secondary">
                        На модерации
                      </span>
                    )}
                    {r.status === 'rejected' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-[#FF3B30]/10 text-[#FF3B30]">
                        Отклонён
                      </span>
                    )}
                    <div className="text-[#FF9500] text-sm">{renderStars(r.rating)}</div>
                  </div>
                </div>
                {r.text && (
                  <div className="mt-3 text-sm text-text-secondary leading-relaxed">
                    {r.text}
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setReportTarget({ type: 'review', id: r.id })}
                    className="text-xs text-[#FF3B30] hover:underline"
                  >
                    Пожаловаться
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report modal */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => {
              setReportTarget(null);
              setReportError('');
              setReportSuccess('');
            }}
            aria-label="Закрыть"
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F2F7]">
              <div className="text-lg font-bold">Жалоба</div>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="w-10 h-10 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] transition flex items-center justify-center text-text-secondary"
                aria-label="Закрыть"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {reportError && <div className="text-sm text-[#FF3B30]">{reportError}</div>}
              {reportSuccess && <div className="text-sm text-[#34C759]">{reportSuccess}</div>}

              <label className="block">
                <div className="text-sm font-medium text-text-secondary mb-2">Причина</div>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 outline-none"
                >
                  {[
                    'Спам/мошенничество',
                    'Оскорбления/ненависть',
                    'Нецензурная лексика',
                    'Ложная информация',
                    'Другое',
                  ].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <div className="text-sm font-medium text-text-secondary mb-2">Комментарий</div>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 outline-none resize-none"
                  placeholder="Опишите, что именно не так"
                />
              </label>

              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setReportTarget(null)}
                >
                  Отмена
                </Button>
                <Button onClick={handleSubmitReport}>Отправить</Button>
              </div>
              <div className="text-xs text-text-secondary">
                Жалобы видны модераторам. Статус рассмотрения можно будет увидеть в будущем в личном кабинете.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Related products */}
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-6">Похожие товары</h2>
        {isRelatedLoading ? (
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="bg-white rounded-2xl shadow-subtle p-4">
                <div className="h-40 bg-[#F2F2F7] rounded-xl mb-3"></div>
                <div className="h-4 bg-[#F2F2F7] rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-[#F2F2F7] rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : relatedProducts.length === 0 ? (
          <div className="text-text-secondary bg-white rounded-2xl shadow-subtle p-6">
            Похожего товара не найдено.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-6">
              {visibleRelatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
            {hasMoreRelatedProducts && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/catalog?category=${productCategoryId}`)}
                >
                  Показать ещё
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}