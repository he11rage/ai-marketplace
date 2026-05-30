import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import Button from '../components/ui/Button';
import { useQueryClient } from '@tanstack/react-query';

export default function CreateProduct() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditMode = !!id;

    // Log mount context in development.
    useEffect(() => {
        console.log('CreateProduct mounted:', { id, isEditMode, url: window.location.href });
    }, [id, isEditMode]);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        old_price: '',
        brand: '',
        stock_quantity: '',
        category: '',
        store: '',
        image: null,
    });

    const [previewUrl, setPreviewUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);

    // Load product data in edit mode.
    const { data: product, isLoading: loadingProduct, error: productError } = useQuery({
        queryKey: ['product', id],
        queryFn: async () => {
            console.log('Fetching product:', id);
            const res = await apiEndpoints.getProduct(id);
            console.log('Product loaded:', res.data);
            return res.data;
        },
        enabled: isEditMode && !!id,
        retry: false, // Do not retry on hard failures.
    });

    // Log product query errors without forcing redirect.
    useEffect(() => {
        if (productError) {
            console.error('Product query error:', productError);
            console.error('  - Status:', productError.response?.status);
            console.error('  - Data:', productError.response?.data);
            // Keep user on the page so the UI can show the error state.
        }
    }, [productError]);

    const { data: stores } = useQuery({
        queryKey: ['my-stores'],
        queryFn: () => apiEndpoints.getMyStores().then(res => res.data),
    });

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => apiEndpoints.getCategories().then(res => res.data),
    });

    useEffect(() => {
        if (product) {
            console.log('Filling form with product data:', product);
            setFormData({
                name: product.name || '',
                description: product.description || '',
                price: product.price?.toString() || '',
                old_price: product.old_price?.toString() || '',
                brand: product.brand || '',
                stock_quantity: product.stock_quantity?.toString() || '',
                category: product.category?.toString() || product.category_name ? product.category : '',
                store: product.store?.toString() || '',
                image: null,
            });
            if (product.image) setPreviewUrl(product.image);
        }
    }, [product]);

    useEffect(() => {
        if (stores?.length > 0 && !formData.store && !isEditMode) {
            setFormData(prev => ({ ...prev, store: stores[0].id.toString() }));
        }
    }, [stores, isEditMode]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({ ...prev, image: file }));
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setFormData(prev => ({ ...prev, image: file }));
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        setIsCreatingCategory(true);
        try {
            const response = await apiEndpoints.createCategory({ name: newCategoryName.trim() });
            const newCategory = response.data;
            setFormData(prev => ({ ...prev, category: newCategory.id.toString() }));
            setNewCategoryName('');
            setShowNewCategory(false);
            await queryClient.invalidateQueries(['categories']);
        } catch (error) {
            console.error('Ошибка создания категории:', error);
            alert('Не удалось создать категорию');
        } finally {
            setIsCreatingCategory(false);
        }
    };

    const saveProduct = async (saveAsDraft = false) => {
        setIsSaving(true);
        try {
            const submitData = new FormData();
            submitData.append('name', formData.name);
            submitData.append('description', formData.description);
            submitData.append('price', formData.price);
            if (formData.old_price && formData.old_price !== formData.price) {
                submitData.append('old_price', formData.old_price);
            }
            if (formData.brand) submitData.append('brand', formData.brand);
            submitData.append('stock_quantity', formData.stock_quantity);
            if (formData.category) submitData.append('category', formData.category);
            submitData.append('store', formData.store);
            if (formData.image) submitData.append('image', formData.image);
            if (saveAsDraft) submitData.append('save_as_draft', 'true');

            if (isEditMode) {
                await apiEndpoints.updateProduct(id, submitData);
                await queryClient.invalidateQueries(['product', id]);
            } else {
                await apiEndpoints.createProduct(submitData);
                await queryClient.invalidateQueries(['products']);
                await queryClient.invalidateQueries(['seller', 'products']);
            }
            await queryClient.invalidateQueries(['my-stores']);
            navigate(saveAsDraft ? '/seller' : '/account');
        } catch (error) {
            console.error('Save error:', error);
            console.error('Response:', error.response?.data);
            alert(`Ошибка: ${error.response?.data?.message || error.message || 'Не удалось сохранить товар'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await saveProduct(false);
    };

    const handleSaveDraft = async (e) => {
        e.preventDefault();
        await saveProduct(true);
    };

    if (isEditMode && loadingProduct) {
        return (
            <div className="max-w-[1440px] mx-auto px-6 py-20 text-center">
                <div className="animate-pulse">
                    <div className="h-8 bg-[#E5E5EA] rounded w-48 mx-auto mb-4"></div>
                    <div className="h-96 bg-[#E5E5EA] rounded-2xl"></div>
                </div>
            </div>
        );
    }

    const selectedCategory = categories?.find(c => c.id.toString() === formData.category?.toString());

    return (
        <form onSubmit={handleSubmit} className="max-w-[1440px] mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => navigate('/account')} className="text-text-secondary hover:text-text-primary transition">← Назад</button>
                    <h1 className="text-2xl font-bold">{isEditMode ? 'Редактирование товара' : 'Добавление товара'}</h1>
                </div>
                <div className="flex gap-3">
                    <Button type="button" variant="secondary" onClick={() => navigate('/account')} disabled={isSaving}>Отмена</Button>
                    {!isEditMode && (
                        <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                            {isSaving ? 'Сохранение...' : 'Сохранить черновик'}
                        </Button>
                    )}
                    <Button type="submit" disabled={isSaving}>{isSaving ? 'Сохранение...' : (isEditMode ? 'Сохранить изменения' : 'На модерацию')}</Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className={`border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center transition cursor-pointer relative overflow-hidden ${dragActive ? 'border-[#007AFF] bg-[#007AFF]/5' : 'border-[#E5E5EA] bg-[#F2F2F7]'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => document.getElementById('imageInput')?.click()}>
                        {previewUrl ? (
                            <><img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition"><span className="text-white text-sm">Изменить фото</span></div></>
                        ) : (
                            <><svg className="w-8 h-8 text-text-secondary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg><span className="text-sm text-text-secondary">Перетащите фото сюда или нажмите</span><span className="text-xs text-text-placeholder mt-1">JPG, PNG до 5MB</span></>
                        )}
                        <input id="imageInput" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </div>

                    <div className="bg-white rounded-2xl shadow-subtle p-6 space-y-4">
                        <h2 className="text-lg font-bold">Информация</h2>
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Название товара" className="w-full px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition" required />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" name="price" value={formData.price} onChange={handleInputChange} placeholder="Цена (₽)" className="px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition" required step="0.01" min="0" />
                            {(isEditMode || formData.old_price) && (<input type="number" name="old_price" value={formData.old_price} onChange={handleInputChange} placeholder="Старая цена (₽)" className="px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition" step="0.01" min="0" />)}
                        </div>
                        <textarea name="description" value={formData.description} onChange={handleInputChange} rows="4" placeholder="Описание товара..." className="w-full px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition resize-none"></textarea>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-subtle p-6 space-y-4">
                        <h2 className="text-lg font-bold">Параметры</h2>
                        <div className="space-y-2">
                            {!showNewCategory ? (
                                <><select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition"><option value="">Выберите категорию</option>{categories?.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}{cat.is_verified === false ? ' (на проверке)' : ''}</option>))}</select><button type="button" onClick={() => setShowNewCategory(true)} className="text-sm text-[#007AFF] hover:underline">+ Создать новую категорию</button>{selectedCategory?.is_verified === false && (<p className="text-xs text-[#FF9500]">Кастомная категория будет проверена модератором вместе с товаром.</p>)}</>
                            ) : (
                                <div className="flex gap-2">
                                    <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Название категории" className="flex-1 px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } if (e.key === 'Escape') { setShowNewCategory(false); setNewCategoryName(''); } }} />
                                    <Button type="button" size="sm" onClick={handleCreateCategory} disabled={isCreatingCategory || !newCategoryName.trim()}>{isCreatingCategory ? '...' : 'Создать'}</Button>
                                    <Button type="button" variant="secondary" size="sm" onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}>Отмена</Button>
                                </div>
                            )}
                        </div>
                        {!isEditMode && (<select name="store" value={formData.store} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition" required><option value="">Выберите магазин</option>{stores?.map(store => (<option key={store.id} value={store.id}>{store.name}</option>))}</select>)}
                        <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} placeholder="Бренд" className="px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition" />
                        <input type="number" name="stock_quantity" value={formData.stock_quantity} onChange={handleInputChange} placeholder="Количество на складе" className="w-full px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition" required min="0" />
                    </div>

                    <div className="bg-white rounded-2xl shadow-subtle p-6">
                        <h3 className="text-sm font-medium text-text-secondary mb-4">Предпросмотр</h3>
                        <div className="bg-white rounded-xl shadow-card overflow-hidden border border-[#E5E5EA]">
                            <div className="h-48 bg-[#F2F2F7] relative">{previewUrl ? (<img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-text-placeholder"><span className="text-sm">Нет фото</span></div>)}</div>
                            <div className="p-4">
                                {formData.name ? (<h4 className="font-semibold text-sm mb-1">{formData.name}</h4>) : (<div className="h-4 bg-[#F2F2F7] rounded w-2/3 mb-2"></div>)}
                                {selectedCategory && (<p className="text-xs text-text-secondary mb-2">{selectedCategory.name}</p>)}
                                {formData.price ? (<div className="flex items-center gap-2"><span className="text-[#007AFF] font-bold text-lg">{formData.price}₽</span>{formData.old_price && parseFloat(formData.old_price) > parseFloat(formData.price) && (<span className="text-text-secondary line-through text-sm">{formData.old_price}₽</span>)}</div>) : (<div className="h-4 bg-[#F2F2F7] rounded w-1/3"></div>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}