import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import ProductCard from '../components/ui/ProductCard';
import Button from '../components/ui/Button';
import Pagination from '../components/ui/Pagination';
import {
  PRODUCTS_PAGE_SIZE,
  getTotalPages,
  parseProductsResponse,
} from '../utils/pagination';

const MIN_RATING_FILTER = 4.5;

function parseCategoryIdsFromQuery(searchParams) {
  const categoriesRaw = searchParams.get('categories')?.trim();
  if (categoriesRaw) {
    return categoriesRaw
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => !Number.isNaN(id));
  }

  const categoryRaw = searchParams.get('category')?.trim();
  if (!categoryRaw) {
    return [];
  }

  const categoryId = Number(categoryRaw);
  return Number.isNaN(categoryId) ? [] : [categoryId];
}

function useDebouncedValue(value, delayMs = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

export default function Catalog() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search')?.trim() || '';
  const currentPage = Math.max(1, Number(searchParams.get('page')) || 1);
  const productsTopRef = useRef(null);
  const initialCategoryIds = useMemo(
    () => parseCategoryIdsFromQuery(searchParams),
    [searchParams]
  );

  const [sort, setSort] = useState('newest');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(initialCategoryIds);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [minRatingEnabled, setMinRatingEnabled] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isBrandsModalOpen, setIsBrandsModalOpen] = useState(false);

  const debouncedPriceMin = useDebouncedValue(priceMin);
  const debouncedPriceMax = useDebouncedValue(priceMax);

  const orderingBySort = {
    newest: '-created_at',
    popular: 'popular',
    rating: '-rating',
    price_asc: 'price',
    price_desc: '-price',
  };

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiEndpoints.getCategories().then((res) => res.data),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['product-brands'],
    queryFn: () => apiEndpoints.getProductBrands().then((res) => res.data),
  });

  const firstCategories = useMemo(() => categories.slice(0, 5), [categories]);
  const firstBrands = useMemo(() => brands.slice(0, 5), [brands]);

  const productFilters = useMemo(() => {
    const filters = {
      search: searchQuery || undefined,
      ordering: orderingBySort[sort],
    };

    if (selectedCategoryIds.length > 0) {
      filters.categories = selectedCategoryIds.join(',');
    }

    if (debouncedPriceMin.trim()) {
      filters.price_min = debouncedPriceMin.trim();
    }

    if (debouncedPriceMax.trim()) {
      filters.price_max = debouncedPriceMax.trim();
    }

    if (minRatingEnabled) {
      filters.min_rating = MIN_RATING_FILTER;
    }

    if (inStockOnly) {
      filters.in_stock = true;
    }

    if (selectedBrands.length > 0) {
      filters.brands = selectedBrands.join(',');
    }

    return {
      ...filters,
      page: currentPage,
      page_size: PRODUCTS_PAGE_SIZE,
    };
  }, [
    searchQuery,
    sort,
    selectedCategoryIds,
    debouncedPriceMin,
    debouncedPriceMax,
    minRatingEnabled,
    inStockOnly,
    selectedBrands,
    currentPage,
  ]);

  const filterSignature = useMemo(
    () =>
      JSON.stringify({
        searchQuery,
        sort,
        selectedCategoryIds,
        debouncedPriceMin,
        debouncedPriceMax,
        minRatingEnabled,
        inStockOnly,
        selectedBrands,
      }),
    [
      searchQuery,
      sort,
      selectedCategoryIds,
      debouncedPriceMin,
      debouncedPriceMax,
      minRatingEnabled,
      inStockOnly,
      selectedBrands,
    ]
  );

  const previousFilterSignatureRef = useRef(filterSignature);

  useEffect(() => {
    if (previousFilterSignatureRef.current === filterSignature) {
      return;
    }

    previousFilterSignatureRef.current = filterSignature;

    if (!searchParams.get('page')) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('page');
    setSearchParams(nextParams, { replace: true });
  }, [filterSignature, searchParams, setSearchParams]);

  const { data: productsPage, isLoading, isFetching } = useQuery({
    queryKey: ['products', 'catalog', productFilters],
    queryFn: () =>
      apiEndpoints.getProducts(productFilters).then((res) => parseProductsResponse(res.data)),
    // Не показывать полный каталог, пока грузится новый поисковый запрос
    placeholderData: searchQuery ? undefined : (previousData) => previousData,
  });

  const products = productsPage?.results ?? [];
  const totalCount = productsPage?.count ?? 0;
  const totalPages = getTotalPages(totalCount, PRODUCTS_PAGE_SIZE);

  const handlePageChange = (page) => {
    const nextParams = new URLSearchParams(searchParams);

    if (page <= 1) {
      nextParams.delete('page');
    } else {
      nextParams.set('page', String(page));
    }

    setSearchParams(nextParams);
    productsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleBrandToggle = (brandName) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName)
        ? prev.filter((name) => name !== brandName)
        : [...prev, brandName]
    );
  };

  const resetFilters = () => {
    setSelectedCategoryIds([]);
    setPriceMin('');
    setPriceMax('');
    setMinRatingEnabled(false);
    setInStockOnly(false);
    setSelectedBrands([]);
    setSort('newest');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="flex items-center gap-2 text-sm text-text-secondary mb-6">
        <span onClick={() => navigate('/')} className="cursor-pointer hover:text-text-primary">
          Главная
        </span>
        <span>/</span>
        <span>Каталог</span>
      </div>

      <div className="flex gap-6">
        <aside className="w-64 space-y-6">
          <div className="bg-white rounded-2xl shadow-subtle p-5">
            <h3 className="font-bold mb-4 text-sm">Фильтры</h3>

            <div className="mb-6">
              <h4 className="font-medium text-sm mb-2">Категория</h4>
              <div className="space-y-2">
                {firstCategories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                      className="w-4 h-4 rounded border-[#D1D1D6] text-[#007AFF]"
                    />
                    <span className="text-text-secondary">{category.name}</span>
                  </label>
                ))}
              </div>
              {categories.length > 5 && (
                <button
                  type="button"
                  onClick={() => setIsCategoriesModalOpen(true)}
                  className="mt-3 text-sm text-[#007AFF] hover:underline"
                >
                  Показать больше
                </button>
              )}
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-sm mb-2">Цена</h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="От"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#F2F2F7] border border-[#E5E5EA] text-sm"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="До"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#F2F2F7] border border-[#E5E5EA] text-sm"
                />
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-sm mb-2">Рейтинг</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={minRatingEnabled}
                    onChange={(e) => setMinRatingEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-[#D1D1D6] text-[#007AFF]"
                  />
                  <span className="text-text-secondary">★★★★★ {MIN_RATING_FILTER}+</span>
                </label>
              </div>
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-[#D1D1D6] text-[#007AFF]"
                />
                <span className="text-text-secondary">Только в наличии</span>
              </label>
            </div>

            {brands.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Бренд</h4>
                <div className="space-y-2">
                  {firstBrands.map((brand) => (
                    <label key={brand} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => handleBrandToggle(brand)}
                        className="w-4 h-4 rounded border-[#D1D1D6] text-[#007AFF]"
                      />
                      <span className="text-text-secondary">{brand}</span>
                    </label>
                  ))}
                </div>
                {brands.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setIsBrandsModalOpen(true)}
                    className="mt-3 text-sm text-[#007AFF] hover:underline"
                  >
                    Показать больше
                  </button>
                )}
              </div>
            )}
          </div>
          <Button variant="secondary" className="w-full" onClick={resetFilters}>
            Сбросить
          </Button>
        </aside>

        <main className="flex-1" ref={productsTopRef}>
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-text-secondary">
              {isLoading ? 'Загрузка…' : `${totalCount} товаров найдено`}
              {searchQuery && ` по запросу "${searchQuery}"`}
              {totalPages > 1 && !isLoading && (
                <span className="text-text-secondary"> · страница {currentPage} из {totalPages}</span>
              )}
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-[#E5E5EA] text-sm"
            >
              <option value="newest">Сначала новые</option>
              <option value="popular">По популярности</option>
              <option value="rating">По рейтингу</option>
              <option value="price_asc">Цена: по возрастанию</option>
              <option value="price_desc">Цена: по убыванию</option>
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-20">Загрузка...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">
              По вашему запросу ничего не найдено
            </div>
          ) : (
            <div className={`grid grid-cols-3 gap-6 ${isFetching ? 'opacity-60' : ''}`}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </main>
      </div>

      {isCategoriesModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setIsCategoriesModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Все категории</h3>
              <button
                type="button"
                onClick={() => setIsCategoriesModalOpen(false)}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                Закрыть
              </button>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="w-4 h-4 rounded border-[#D1D1D6] text-[#007AFF]"
                  />
                  <span className="text-text-secondary">{category.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {isBrandsModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setIsBrandsModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Все бренды</h3>
              <button
                type="button"
                onClick={() => setIsBrandsModalOpen(false)}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                Закрыть
              </button>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {brands.map((brand) => (
                <label key={brand} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => handleBrandToggle(brand)}
                    className="w-4 h-4 rounded border-[#D1D1D6] text-[#007AFF]"
                  />
                  <span className="text-text-secondary">{brand}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
