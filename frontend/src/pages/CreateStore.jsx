import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import Button from '../components/ui/Button';

export default function CreateStore() {
    const queryClient = useQueryClient();
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        logo: null,
    });

    const [previewUrl, setPreviewUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Load store data in edit mode.
    const { data: store, isLoading: loadingStore } = useQuery({
        queryKey: ['store', id],
        queryFn: () => apiEndpoints.getStore(id).then(res => res.data),
        enabled: isEditMode,
    });

    // Prefill form with existing store values.
    useEffect(() => {
        if (store) {
            setFormData({
                name: store.name || '',
                description: store.description || '',
                logo: null,
            });
            if (store.logo) setPreviewUrl(store.logo);
        }
    }, [store]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({ ...prev, logo: file }));
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const submitData = new FormData();
            submitData.append('name', formData.name);
            submitData.append('description', formData.description || '');
            if (formData.logo) submitData.append('logo', formData.logo);

            if (isEditMode) {
                await apiEndpoints.updateStore(id, submitData);
            } else {
                await apiEndpoints.createStore(submitData);
            }

            await queryClient.invalidateQueries(['stores']);
            await queryClient.invalidateQueries(['user']);

            navigate('/account');
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Не удалось сохранить магазин');
        } finally {
            setIsSaving(false);
        }
    };

    if (isEditMode && loadingStore) {
        return (
            <div className="max-w-[1440px] mx-auto px-6 py-20 text-center">
                <div className="animate-pulse">
                    <div className="h-8 bg-[#E5E5EA] rounded w-48 mx-auto mb-4"></div>
                    <div className="h-96 bg-[#E5E5EA] rounded-2xl"></div>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-[1440px] mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/account')}
                        className="text-text-secondary hover:text-text-primary transition"
                    >
                        ← Назад
                    </button>
                    <h1 className="text-2xl font-bold">
                        {isEditMode ? 'Редактирование магазина' : 'Создание магазина'}
                    </h1>
                </div>
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate('/account')}
                        disabled={isSaving}
                    >
                        Отмена
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? 'Сохранение...' : (isEditMode ? 'Сохранить изменения' : 'Создать магазин')}
                    </Button>
                </div>
            </div>

            <div className="flex gap-8">
                {/* Left: Form */}
                <div className="flex-1 space-y-6">

                    {/* Logo Upload */}
                    <div className="bg-white rounded-2xl shadow-subtle p-6">
                        <h2 className="text-lg font-bold mb-4">Логотип</h2>
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-2xl bg-[#F2F2F7] border-2 border-dashed border-[#E5E5EA] flex items-center justify-center overflow-hidden flex-shrink-0">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <svg className="w-10 h-10 text-text-placeholder" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <label className="inline-block px-4 py-2 bg-[#007AFF] text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-[#0066CC] transition">
                                    Загрузить логотип
                                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                </label>
                                <p className="text-xs text-text-secondary mt-2">PNG, JPG до 5MB</p>
                            </div>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="bg-white rounded-2xl shadow-subtle p-6 space-y-4">
                        <h2 className="text-lg font-bold">Основная информация</h2>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Название магазина *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition"
                                placeholder="Например: TechGadgets"
                                required
                            />
                            <p className="text-xs text-text-secondary mt-1">
                                URL магазина будет сгенерирован автоматически
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Описание</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows="4"
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm focus:bg-white focus:border-[#007AFF] outline-none transition resize-none"
                                placeholder="Расскажите о вашем магазине..."
                            ></textarea>
                        </div>
                    </div>
                </div>

                {/* Right: Live Preview */}
                <div className="w-96 sticky top-20 h-fit">
                    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                        {/* Banner */}
                        <div className="h-32 bg-gradient-to-r from-[#007AFF] to-[#5856D6] relative">
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-white/20 backdrop-blur-sm"></div>
                        </div>

                        <div className="px-6 pb-6 relative">
                            {/* Avatar */}
                            <div className="-mt-12 mb-4 flex justify-center">
                                <div className="w-20 h-20 rounded-2xl bg-white shadow-lg border-4 border-white flex items-center justify-center text-2xl font-bold text-[#007AFF] overflow-hidden">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        formData.name ? formData.name.charAt(0).toUpperCase() : '?'
                                    )}
                                </div>
                            </div>

                            {/* Info */}
                            <h3 className="text-center font-bold text-xl mb-1">
                                {formData.name || 'Название магазина'}
                            </h3>
                            <p className="text-center text-sm text-text-secondary mb-4">
                                {formData.description || 'Описание вашего магазина...'}
                            </p>

                            {/* Fake Products Grid */}
                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <div className="bg-[#F2F2F7] h-24 rounded-lg animate-pulse"></div>
                                <div className="bg-[#F2F2F7] h-24 rounded-lg animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}