import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import ProductCard from '../components/ui/ProductCard';
import Button from '../components/ui/Button';

export default function Catalog() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search')?.trim() || '';
  const categoryFromQuery = searchParams.get('category')?.trim() || '';
  const initialCategoryId = categoryFromQuery ? Number(categoryFromQuery) : null;
  const [sort, setSort] = useState('relevance');
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    Number.isNaN(initialCategoryId) ? null : initialCategoryId
  );
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const orderingBySort = {
    relevance: 'relevance',
    price_asc: 'price',
    price_desc: '-price',
  };

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiEndpoints.getCategories().then(res => res.data),
  });

  const firstCategories = useMemo(() => categories.slice(0, 5), [categories]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', { sort, searchQuery, selectedCategoryId }],
    queryFn: () => apiEndpoints.getProducts({
      search: searchQuery || undefined,
      ordering: orderingBySort[sort],
      category: selectedCategoryId || undefined,
    }).then(res => res.data),
  });

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategoryId(prev => (prev === categoryId ? null : categoryId));
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-text-secondary mb-6">
        <span onClick={() => navigate('/')} className="cursor-pointer hover:text-text-primary">Главная</span>
        <span>/</span>
        <span>Каталог</span>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <aside className="w-64 space-y-6">
          <div className="bg-white rounded-2xl shadow-subtle p-5">
            <h3 className="font-bold mb-4 text-sm">Фильтры</h3>
            
            {/* Category */}
            <div className="mb-6">
              <h4 className="font-medium text-sm mb-2">Категория</h4>
              <div className="space-y-2">
                {firstCategories.map(category => (
                  <label key={category.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategoryId === category.id}
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

            {/* Price Range */}
            <div className="mb-6">
              <h4 className="font-medium text-sm mb-2">Цена</h4>
              <div className="flex gap-2">
                <input type="number" placeholder="От" className="w-full px-3 py-2 rounded-lg bg-[#F2F2F7] border border-[#E5E5EA] text-sm" />
                <input type="number" placeholder="До" className="w-full px-3 py-2 rounded-lg bg-[#F2F2F7] border border-[#E5E5EA] text-sm" />
              </div>
            </div>

            {/* Rating */}
            <div>
              <h4 className="font-medium text-sm mb-2">Рейтинг</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded" />
                  <span className="text-text-secondary">★★★★★ 4.5+</span>
                </label>
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setSelectedCategoryId(null);
              setSort('relevance');
            }}
          >
            Сбросить
          </Button>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-text-secondary">
              {products?.length || 0} товаров найдено
              {searchQuery && ` по запросу "${searchQuery}"`}
            </span>
            <select 
              value={sort} 
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-[#E5E5EA] text-sm"
            >
              <option value="relevance">По релевантности</option>
              <option value="price_asc">Цена: по возрастанию</option>
              <option value="price_desc">Цена: по убыванию</option>
            </select>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="text-center py-20">Загрузка...</div>
          ) : products?.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">
              По вашему запросу ничего не найдено
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {products?.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          
          <div className="mt-8 text-center">
            <Button variant="secondary">Показать ещё</Button>
          </div>
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
              {categories.map(category => (
                <label key={category.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategoryId === category.id}
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
    </div>
  );
}