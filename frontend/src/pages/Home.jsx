import '../Home.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Product from '../components/Product';

const PRODUCTS_API_URL = '/api/products/';

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

	useEffect(() => {
		const controller = new AbortController();

		const loadProducts = async () => {
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

				console.error('Ошибка загрузки товаров:', err);
				setError('Не удалось загрузить товары из backend.');
			} finally {
				setIsLoading(false);
			}
		};

		loadProducts();

		return () => controller.abort();
	}, []);

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
					<button type="button" className="home-header__icon">
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
				<ul className="home-products-grid">
					{products.map((product) => (
						<li key={product.id}>
							<Product product={product} formatPrice={formatPrice} />
						</li>
					))}
				</ul>
			</section>
		</main>
	);
};

export default Home;
