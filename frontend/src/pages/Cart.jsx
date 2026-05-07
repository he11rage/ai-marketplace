import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../Cart.css';

const DELIVERY_PRICE = 490;
const CART_API_URL = '/api/cart/';
const PRODUCTS_API_URL = '/api/products/';

const formatPrice = (value) => {
	const numeric = Number(value);
	if (Number.isNaN(numeric)) {
		return '0 ₽';
	}
	return `${new Intl.NumberFormat('ru-RU').format(numeric)} ₽`;
};

const mapCartItems = (cartItems, productsMap) => {
	const groupedItems = new Map();

	cartItems.forEach((item) => {
		const productId = Number(item.product);
		const quantity = Number(item.quantity) || 0;

		if (groupedItems.has(productId)) {
			const existingItem = groupedItems.get(productId);
			existingItem.quantity += quantity;
			existingItem.cartItemIds.push(item.id);
			return;
		}

		groupedItems.set(productId, {
			...item,
			product: productId,
			quantity,
			cartItemIds: [item.id],
			productData: productsMap.get(productId) || null,
		});
	});

	return Array.from(groupedItems.values());
};

const Cart = () => {
	const [items, setItems] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isUpdatingItemId, setIsUpdatingItemId] = useState(null);
	const [error, setError] = useState('');

	useEffect(() => {
		const controller = new AbortController();

		const loadCart = async () => {
			const token = localStorage.getItem('accessToken');
			if (!token) {
				setError('Чтобы увидеть корзину, войдите в аккаунт.');
				setItems([]);
				setIsLoading(false);
				return;
			}

			try {
				const [cartResponse, productsResponse] = await Promise.all([
					axios.get(CART_API_URL, { signal: controller.signal }),
					axios.get(PRODUCTS_API_URL, { signal: controller.signal }),
				]);

				const products = Array.isArray(productsResponse.data)
					? productsResponse.data
					: [];
				const productsMap = new Map(products.map((product) => [product.id, product]));
				const cartItems = Array.isArray(cartResponse.data) ? cartResponse.data : [];

				const mappedItems = mapCartItems(cartItems, productsMap);

				setItems(mappedItems);
				setError('');
			} catch (err) {
				if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
					return;
				}

				if (err?.response?.status === 401) {
					setError('Сессия истекла. Войдите заново.');
				} else {
					setError('Не удалось загрузить корзину.');
				}
				setItems([]);
			} finally {
				setIsLoading(false);
			}
		};

		loadCart();

		return () => controller.abort();
	}, []);

	const updateQuantity = async (item, nextQuantity) => {
		const safeQuantity = Math.max(1, nextQuantity);
		setIsUpdatingItemId(item.id);
		try {
			const [primaryItemId, ...duplicateItemIds] = item.cartItemIds ?? [item.id];
			const response = await axios.patch(`${CART_API_URL}${primaryItemId}/`, {
				quantity: safeQuantity,
			});
			const updatedItem = response.data;

			if (duplicateItemIds.length) {
				await Promise.all(
					duplicateItemIds.map((duplicateItemId) =>
						axios.delete(`${CART_API_URL}${duplicateItemId}/`)
					)
				);
			}

			setItems((prevItems) =>
				prevItems.map((item) =>
					item.id === updatedItem.id
						? { ...item, quantity: updatedItem.quantity, cartItemIds: [updatedItem.id] }
						: item
				)
			);
			setError('');
		} catch {
			setError('Не удалось обновить количество товара.');
		} finally {
			setIsUpdatingItemId(null);
		}
	};

	const removeItem = async (item) => {
		setIsUpdatingItemId(item.id);
		try {
			const itemIdsToDelete = item.cartItemIds ?? [item.id];
			await Promise.all(
				itemIdsToDelete.map((itemId) => axios.delete(`${CART_API_URL}${itemId}/`))
			);
			setItems((prevItems) => prevItems.filter((cartItem) => cartItem.id !== item.id));
			setError('');
		} catch {
			setError('Не удалось удалить товар из корзины.');
		} finally {
			setIsUpdatingItemId(null);
		}
	};

	const { subtotal, totalDiscount, total } = useMemo(() => {
		const subtotalValue = items.reduce(
			(sum, item) => sum + Number(item.productData?.price || 0) * item.quantity,
			0
		);
		const discountValue = items.reduce((sum, item) => {
			const currentPrice = Number(item.productData?.price || 0);
			const oldPrice = Number(item.productData?.old_price || 0);
			if (!oldPrice || oldPrice <= currentPrice) {
				return sum;
			}

			return sum + (oldPrice - currentPrice) * item.quantity;
		}, 0);

		const delivery = items.length ? DELIVERY_PRICE : 0;

		return {
			subtotal: subtotalValue,
			totalDiscount: discountValue,
			total: subtotalValue + delivery,
		};
	}, [items]);

	const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

	return (
		<main className="cart-page">
			<section className="cart-content">
				<header className="cart-header">
					<div className="cart-header__meta">
						<h1>Корзина</h1>
						<p>{items.length ? `${totalItemsCount} позиций` : 'Корзина пуста'}</p>
					</div>
					<Link to="/" className="cart-home-link">
						На главную
					</Link>
				</header>
				{isLoading && <p>Загрузка корзины...</p>}
				{error && <p>{error}</p>}

				{!isLoading && items.length === 0 ? (
					<div className="cart-empty">
						<h2>Пока ничего нет</h2>
						<p>Добавьте товары из каталога, и они появятся здесь.</p>
					</div>
				) : (
					<ul className="cart-list">
						{items.map((item) => (
							<li key={item.id} className="cart-item">
								<div className="cart-item__image" aria-hidden="true">
									{(item.productData?.name || `Товар ${item.product}`).split(' ')[0]}
								</div>
								<div className="cart-item__info">
									<h3>{item.productData?.name || `Товар #${item.product}`}</h3>
									<p>{item.productData?.description || 'Описание отсутствует'}</p>
									<div className="cart-item__prices">
										<strong>{formatPrice(item.productData?.price)}</strong>
										{item.productData?.old_price && (
											<span>{formatPrice(item.productData.old_price)}</span>
										)}
									</div>
								</div>
								<div className="cart-item__actions">
									<div className="cart-quantity" aria-label="Количество товара">
										<button
											type="button"
											disabled={isUpdatingItemId === item.id}
											onClick={() =>
												updateQuantity(item, item.quantity - 1)
											}
										>
											-
										</button>
										<span>{item.quantity}</span>
										<button
											type="button"
											disabled={isUpdatingItemId === item.id}
											onClick={() =>
												updateQuantity(item, item.quantity + 1)
											}
										>
											+
										</button>
									</div>
									<button
										type="button"
										className="cart-remove"
										disabled={isUpdatingItemId === item.id}
										onClick={() => removeItem(item)}
									>
										Удалить
									</button>
								</div>
							</li>
						))}
					</ul>
				)}
			</section>

			<aside className="cart-summary">
				<h2>Ваш заказ</h2>
				<div className="cart-summary__row">
					<span>Товары</span>
					<strong>{formatPrice(subtotal)}</strong>
				</div>
				<div className="cart-summary__row">
					<span>Скидка</span>
					<strong className="cart-summary__discount">
						-{formatPrice(totalDiscount)}
					</strong>
				</div>
				<div className="cart-summary__row">
					<span>Доставка</span>
					<strong>{items.length ? formatPrice(DELIVERY_PRICE) : '0 ₽'}</strong>
				</div>
				<div className="cart-summary__total">
					<span>Итого</span>
					<strong>{formatPrice(total)}</strong>
				</div>
				<button type="button" className="cart-summary__button" disabled={!items.length}>
					Перейти к оформлению
				</button>
			</aside>
		</main>
	);
};

export default Cart;
