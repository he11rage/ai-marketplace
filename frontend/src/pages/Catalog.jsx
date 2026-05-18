import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import ProductCard from '../components/ui/ProductCard';
import Button from '../components/ui/Button';

export default function Catalog() {
  const navigate = useNavigate();
  const [sort, setSort] = useState('relevance');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiEndpoints.getProducts().then(res => res.data),
  });

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
                {['Электроника', 'Одежда', 'Дом и сад', 'Спорт'].map(cat => (
                  <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-[#D1D1D6] text-[#007AFF]" />
                    <span className="text-text-secondary">{cat}</span>
                  </label>
                ))}
              </div>
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
          <Button variant="secondary" className="w-full">Сбросить</Button>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-text-secondary">{products?.length || 0} товаров найдено</span>
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
    </div>
  );
}