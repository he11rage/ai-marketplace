import '../Home.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Product from '../components/Product';

const PRODUCTS_API_URL = '/api/products/';
const CART_API_URL = '/api/cart/';

const formatPrice = (value) => {
	if (value === null || value === undefined) {
		return 'Цена не указана';
	}

	const numeric = Number(value);
	if (Number.isNaN(numeric)) {
		return `${value} ₽`;
	}

	return `${new Intl.NumberFormat('ru-RU').format(numeric)} ₽`;
};

const Home = () => {
	const navigate = useNavigate();
	const [products, setProducts] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [cartMessage, setCartMessage] = useState('');
	const [addingProductId, setAddingProductId] = useState(null);

	useEffect(() => {
		const controller = new AbortController();

		const loadProducts = async (retryWithoutAuth = true) => {
			try {
				const response = await axios.get(PRODUCTS_API_URL, {
					signal: controller.signal,
				});
				const data = response.data;
				setProducts(Array.isArray(data) ? data : []);
				setError('');
			} catch (err) {
				if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
					return;
				}

				if (err?.response?.status === 401 && retryWithoutAuth) {
					localStorage.removeItem('accessToken');
					localStorage.removeItem('refreshToken');
					localStorage.removeItem('currentUser');
					delete axios.defaults.headers.common.Authorization;
					await loadProducts(false);
					return;
				}

				console.error('Ошибка загрузки товаров:', err);
				setError('Не удалось загрузить товары из backend.');
			} finally {
				setIsLoading(false);
			}
		};

		loadProducts();

		return () => controller.abort();
	}, []);

	const handleAddToCart = async (product) => {
		const token = localStorage.getItem('accessToken');
		if (!token) {
			navigate('/login');
			return;
		}

		setCartMessage('');
		setAddingProductId(product.id);

		try {
			const cartResponse = await axios.get(CART_API_URL);
			const cartItems = Array.isArray(cartResponse.data) ? cartResponse.data : [];
			const existingCartItem = cartItems.find(
				(item) => Number(item.product) === Number(product.id)
			);

			if (existingCartItem) {
				const currentQuantity = Number(existingCartItem.quantity) || 0;
				await axios.patch(`${CART_API_URL}${existingCartItem.id}/`, {
					quantity: currentQuantity + 1,
				});
			} else {
				await axios.post(CART_API_URL, {
					product: product.id,
					quantity: 1,
				});
			}
			setCartMessage('Товар добавлен в корзину.');
		} catch (err) {
			console.error('Ошибка добавления товара в корзину:', err);
			if (err?.response?.status === 401) {
				localStorage.removeItem('accessToken');
				localStorage.removeItem('refreshToken');
				localStorage.removeItem('currentUser');
				delete axios.defaults.headers.common.Authorization;
				navigate('/login');
				return;
			}
			setCartMessage('Не удалось добавить товар в корзину.');
		} finally {
			setAddingProductId(null);
		}
	};

	return (
		<main className="home-page">
			<header className="home-header">
				<a href="/" aria-label="Лого" className="home-header__logo">
					Market
				</a>
				<form className="home-header__search" role="search">
					<input
						type="search"
						placeholder="Поиск товаров"
						aria-label="Поиск товаров"
					/>
				</form>
				<button type="button" className="home-header__assistant">
					AI
				</button>
				<div className="home-header__actions">
					<button type="button" className="home-header__icon">
						Избр
					</button>
					<button
						type="button"
						className="home-header__icon"
						onClick={() => navigate('/cart')}
					>
						Корз
					</button>
					<button
						type="button"
						className="home-header__icon"
						onClick={() => navigate('/login')}
					>
						Проф
					</button>
				</div>
			</header>

			<section className="home-banner-section">
				<div className="home-banner">
					<h2>Весенняя распродажа</h2>
					<p>Скидки до 40% на популярные категории товаров.</p>
					<button type="button">Смотреть акции</button>
				</div>
			</section>

			<section className="home-title-section">
				<h1 className="home-title">Главная</h1>
			</section>

			<section className="home-products-section">
				{isLoading && <p>Загрузка товаров...</p>}
				{error && <p>{error}</p>}
				{cartMessage && <p>{cartMessage}</p>}
				<ul className="home-products-grid">
					{products.map((product) => (
						<li key={product.id}>
							<Product
								product={product}
								formatPrice={formatPrice}
								onAddToCart={handleAddToCart}
								buttonLabel={
									addingProductId === product.id
										? 'Добавляем...'
										: 'В корзину'
								}
							/>
						</li>
					))}
				</ul>
			</section>
		</main>
	);
};

export default Home;
