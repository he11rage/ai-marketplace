import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import ProductCard from '../components/ui/ProductCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';

export default function Home() {
	const [view, setView] = useState('products');
	const navigate = useNavigate();

	const { data: products, isLoading: loadingProducts, error: productsError } = useQuery({
		queryKey: ['products'],
		queryFn: async () => {
			const res = await apiEndpoints.getProducts();
			return res.data;
		},
	});

	const { data: stores, isLoading: loadingStores, error: storesError } = useQuery({
		queryKey: ['stores'],
		queryFn: async () => {
			const res = await apiEndpoints.getStores();
			return res.data;
		},
	});

	return (
		<div className="min-h-screen">
			{/* Hero Banner */}
			<div className="max-w-[1440px] mx-auto px-6 py-8">
				<div className="rounded-2xl p-12 mb-10 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' }}>
					<div className="relative z-10 max-w-xl">
						<h1 className="text-3xl font-bold mb-3">AI-маркетплейс с конструктором магазинов</h1>
						<p className="text-white/80 text-base mb-5">
							Персонализированные рекомендации и инструменты для запуска бизнеса за минуты.
						</p>
						<div className="flex gap-3">
							<Button variant="secondary" onClick={() => navigate('/catalog')}>Начать покупки</Button>
							<button
								onClick={() => navigate('/create-store')}
								className="px-6 py-2.5 rounded-xl border-2 border-white text-white font-medium hover:bg-white hover:text-[#007AFF] transition"
							>
								Создать магазин
							</button>
						</div>
					</div>
				</div>

				{/* Toggle View */}
				<div className="flex items-center justify-between mb-6">
					<div className="inline-flex p-1 bg-[#F2F2F7] rounded-xl">
						<button
							onClick={() => setView('products')}
							className={`px-6 py-2 rounded-lg text-sm font-medium transition ${view === 'products' ? 'bg-white text-[#007AFF] shadow-sm' : 'text-text-secondary'}`}
						>
							Товары
						</button>
						<button
							onClick={() => setView('stores')}
							className={`px-6 py-2 rounded-lg text-sm font-medium transition ${view === 'stores' ? 'bg-white text-[#007AFF] shadow-sm' : 'text-text-secondary'}`}
						>
							Магазины
						</button>
					</div>
					<select className="px-3 py-2 rounded-xl bg-white border border-[#E5E5EA] text-sm">
						<option>По популярности</option>
						<option>Цена: по возрастанию</option>
					</select>
				</div>

				{/* Grid */}
				{view === 'products' ? (
					<div className="grid grid-cols-4 gap-6">
						{loadingProducts ? (
							<p className="text-text-secondary col-span-4 text-center py-10">Загрузка товаров...</p>
						) : (!products || products.length === 0) ? (
							<div className="col-span-4">
								<EmptyState
									title="Товары пока не найдены"
									description={productsError ? "Не удалось загрузить товары. Проверьте подключение." : "Мы пока не добавили товары, но скоро наполним каталог!"}
									icon="box"
								/>
							</div>
						) : (
							products.map(product => <ProductCard key={product.id} product={product} />)
						)}
					</div>
				) : (
					<div className="grid grid-cols-3 gap-6">
						{loadingStores ? (
							<p className="text-text-secondary col-span-3 text-center py-10">Загрузка магазинов...</p>
						) : (!stores || stores.length === 0) ? (
							<div className="col-span-3">
								<EmptyState
									title="Магазины пока не найдены"
									description={storesError ? "Не удалось загрузить магазины." : "Стань первым — создай свой магазин прямо сейчас!"}
									icon="box"
									actionLabel="Создать магазин"
									onAction={() => navigate('/create-store')}  // 👈 Теперь кнопка ведёт куда надо
								/>
							</div>
						) : (
							stores.map(store => (
								<div
									key={store.id}
									className="bg-white rounded-2xl shadow-subtle overflow-hidden hover:shadow-card transition-all duration-300 cursor-pointer group hover:-translate-y-1"
									onClick={() => navigate(`/store/${store.id}`)}
								>
									<div className="h-28" style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' }}></div>
									<div className="p-5 -mt-8 relative">
										{/* Логотип с корректным отображением */}
										<div className="w-16 h-16 rounded-2xl bg-white shadow-lg border-4 border-white flex items-center justify-center font-bold text-lg text-[#007AFF] mb-3 overflow-hidden">
											{store.logo ? (
												<img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
											) : (
												store.name?.charAt(0).toUpperCase() || 'S'
											)}
										</div>
										<h3 className="font-bold text-lg mb-1">{store.name}</h3>
										<p className="text-xs text-text-secondary mb-3 line-clamp-2">{store.description}</p>
										<Badge variant="info">{store.products_count || 0} товаров</Badge>
									</div>
								</div>
							))
						)}
					</div>
				)}
			</div>
		</div>
	);
}