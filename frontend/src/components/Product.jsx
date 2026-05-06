const Product = ({ product, formatPrice, onAddToCart, buttonLabel = 'В корзину' }) => {
	const productName = product?.brand || product?.name || 'Без названия';
	const displayedPrice = formatPrice
		? formatPrice(product?.price)
		: product?.price || 'Цена не указана';

	return (
		<article className="home-product-card">
			<div className="home-product__image">Фото товара</div>
			<p className="home-product__brand">{productName}</p>
			<p className="home-product__price">{displayedPrice}</p>
			<button
				type="button"
				className="home-product__button"
				onClick={onAddToCart ? () => onAddToCart(product) : undefined}
			>
				{buttonLabel}
			</button>
		</article>
	);
};

export default Product;
