import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import ProductCard from '../components/ui/ProductCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import {
	PRODUCTS_PAGE_SIZE,
	getPageFromPaginatedUrl,
	parseProductsResponse,
} from '../utils/pagination';

export default function Home() {
	const [view, setView] = useState('products');
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [productSort, setProductSort] = useState('relevance');
	const [storeSort, setStoreSort] = useState('relevance');

	const selectedStoreIds = useMemo(() => {
		const storesRaw = searchParams.get('store_ids') || searchParams.get('stores') || '';
		return storesRaw
			.split(',')
			.map((value) => Number.parseInt(value.trim(), 10))
			.filter((value) => Number.isInteger(value));
	}, [searchParams]);

	const hasSelectedStores = selectedStoreIds.length > 0;
	const productOrderingBySort = {
		relevance: 'relevance',
		price_asc: 'price',
		price_desc: '-price',
	};

	const loadMoreRef = useRef(null);

	const {
		data: productsData,
		isLoading: loadingProducts,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		error: productsError,
	} = useInfiniteQuery({
		queryKey: ['products', 'home', { productSort, selectedStoreIds }],
		queryFn: async ({ pageParam = 1 }) => {
			const params = {
				ordering: productOrderingBySort[productSort],
				page: pageParam,
				page_size: PRODUCTS_PAGE_SIZE,
			};
			if (hasSelectedStores) {
				params.store_ids = selectedStoreIds.join(',');
			}
			const res = await apiEndpoints.getProducts(params);
			return parseProductsResponse(res.data);
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage) => getPageFromPaginatedUrl(lastPage.next),
	});

	const products = useMemo(
		() => productsData?.pages.flatMap((page) => page.results) ?? [],
		[productsData]
	);

	useEffect(() => {
		const sentinel = loadMoreRef.current;
		if (!sentinel || view !== 'products') {
			return undefined;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ rootMargin: '240px' }
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [view, hasNextPage, isFetchingNextPage, fetchNextPage]);

	const { data: stores, isLoading: loadingStores, error: storesError } = useQuery({
		queryKey: ['stores'],
		queryFn: async () => {
			const res = await apiEndpoints.getStores();
			return res.data;
		},
	});

	const sortedStores = useMemo(() => {
		if (!stores) return [];
		if (storeSort === 'created_at') {
			return [...stores].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
		}
		return stores;
	}, [stores, storeSort]);

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
					{view === 'products' ? (
						<select
							value={productSort}
							onChange={(event) => setProductSort(event.target.value)}
							className="px-3 py-2 rounded-xl bg-white border border-[#E5E5EA] text-sm"
						>
							<option value="relevance">По релевантности</option>
							<option value="price_asc">Цена: по возрастанию</option>
							<option value="price_desc">Цена: по убыванию</option>
						</select>
					) : (
						<select
							value={storeSort}
							onChange={(event) => setStoreSort(event.target.value)}
							className="px-3 py-2 rounded-xl bg-white border border-[#E5E5EA] text-sm"
						>
							<option value="relevance">По релевантности</option>
							<option value="created_at">По дате создания</option>
						</select>
					)}
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
							<>
								{products.map((product) => (
									<ProductCard key={product.id} product={product} />
								))}
								<div ref={loadMoreRef} className="col-span-4 h-1" aria-hidden="true" />
								{isFetchingNextPage && (
									<p className="col-span-4 text-center py-6 text-sm text-text-secondary">
										Загрузка товаров...
									</p>
								)}
							</>
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
									onAction={() => navigate('/create-store')}  // Route action to store creation.
								/>
							</div>
						) : (
							sortedStores.map(store => (
								<div
									key={store.id}
									className="bg-white rounded-2xl shadow-subtle overflow-hidden hover:shadow-card transition-all duration-300 cursor-pointer group hover:-translate-y-1"
									onClick={() => navigate(`/store/${store.id}`)}
								>
									<div className="h-28" style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' }}></div>
									<div className="p-5 -mt-8 relative">
										{/* Store logo with fallback initial. */}
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