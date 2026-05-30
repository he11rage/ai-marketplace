import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { apiEndpoints } from '../../api/axios';
import { useWishlist } from '../../hooks/useWishlist';
import Button from './Button';

const REPORT_REASONS = [
    'Спам/мошенничество',
    'Оскорбления/ненависть',
    'Нецензурная лексика',
    'Ложная информация',
    'Другое',
];

export default function ProductCard({ product, isOwner = false }) {
    const navigate = useNavigate();
    const { toggle, isInWishlist } = useWishlist();
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
    const [reportDescription, setReportDescription] = useState('');
    const [reportError, setReportError] = useState('');
    const [reportSuccess, setReportSuccess] = useState('');
    const liked = isInWishlist(product.id);
    const discount = product.old_price ? Math.round(((product.old_price - product.price) / product.old_price) * 100) : 0;
    const categoryName = product.category_name || product.category?.name || '';
    const sellerName = product.store_name || product.store?.name || '';
    const ratingValue = Number(product.rating ?? 0);
    const safeRating = Number.isFinite(ratingValue) ? ratingValue : 0;
    const filledStars = Math.max(0, Math.min(5, Math.round(safeRating)));

    // Open product details on card click.
    const handleCardClick = () => {
        navigate(`/product/${product.id}`);
    };

    // Open edit screen for product owners.
    const handleEditClick = (e) => {
        e.stopPropagation(); // Prevent triggering card navigation.
        navigate(`/create-product/${product.id}`);
    };

    // Toggle wishlist state.
    const handleLikeClick = (e) => {
        e.stopPropagation();
        toggle(product);
    };

    const closeReportModal = () => {
        setIsReportOpen(false);
        setReportError('');
        setReportSuccess('');
    };

    const handleReportClick = (e) => {
        e.stopPropagation();
        setIsReportOpen(true);
    };

    const handleSubmitReport = async () => {
        setReportError('');
        setReportSuccess('');
        try {
            await apiEndpoints.createReport({
                target_type: 'product',
                product: Number(product.id),
                reason: reportReason,
                description: reportDescription,
            });
            setReportSuccess('Жалоба отправлена.');
            setReportDescription('');
        } catch (e) {
            const msg = e?.response?.data?.detail || 'Не удалось отправить жалобу.';
            setReportError(msg);
        }
    };

    return (
        <div 
            onClick={handleCardClick}
            className="bg-white rounded-2xl shadow-subtle overflow-hidden hover:shadow-card transition-all duration-300 cursor-pointer group hover:-translate-y-1 relative"
        >
            <div className="h-52 relative bg-[#F2F2F7] overflow-hidden">
                {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> 
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#f0f4ff] to-[#e8f0ff]" />
                )}
                
                {/* Edit button for owner. */}
                {isOwner && (
                    <button 
                        className="absolute top-3 left-3 w-9 h-9 bg-[#007AFF] rounded-full flex items-center justify-center hover:scale-110 transition shadow-md z-20"
                        onClick={handleEditClick}
                        title="Редактировать товар"
                        type="button"
                    >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                )}
                
                {/* Wishlist button. */}
                <button 
                    className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 z-20 ${
                        liked 
                            ? 'bg-[#FF3B30] opacity-100 shadow-md' 
                            : 'bg-white/80 backdrop-blur opacity-0 group-hover:opacity-100 hover:bg-white'
                    }`}
                    onClick={handleLikeClick}
                    type="button"
                >
                    <svg 
                        className={`w-5 h-5 ${liked ? 'text-white' : 'text-text-secondary hover:text-[#FF3B30]'}`} 
                        fill={liked ? "currentColor" : "none"} 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth="1.5" 
                            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                        />
                    </svg>
                </button>
            </div>
            
            <div className="p-4">
                {categoryName && (
                    <p className="text-xs text-text-secondary mb-1">{categoryName}</p>
                )}

                <h3 className="font-semibold text-sm mb-1 truncate">{product.name}</h3>
                
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-[#007AFF] font-bold">{product.price}₽</span>
                    {product.old_price && (
                        <span className="text-xs text-text-secondary line-through">{product.old_price}₽</span>
                    )}
                    {discount > 0 && (
                        <span className="text-[10px] font-bold text-[#FF3B30] bg-[#FF3B30]/10 px-1.5 py-0.5 rounded-md">-{discount}%</span>
                    )}
                </div>
                
                <div className="flex items-center gap-1 min-w-0">
                    <div className="flex text-xs shrink-0">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <span key={index} className={index < filledStars ? 'text-[#FF9500]' : 'text-[#D1D5DB]'}>
                                ★
                            </span>
                        ))}
                    </div>
                    <span className="text-xs text-text-secondary shrink-0">
                        {safeRating.toFixed(1)} ({product.review_count || 0})
                    </span>
                    {sellerName && (
                        <>
                            <span className="text-xs text-text-secondary shrink-0">·</span>
                            <span className="text-xs text-text-secondary truncate" title={sellerName}>
                                {sellerName}
                            </span>
                        </>
                    )}
                </div>

                {!isOwner && (
                    <button
                        type="button"
                        onClick={handleReportClick}
                        className="mt-2 text-xs text-[#FF3B30] hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Пожаловаться на товар"
                    >
                        Пожаловаться
                    </button>
                )}
            </div>

            {isReportOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/30"
                        onClick={closeReportModal}
                        aria-label="Закрыть"
                    />
                    <div
                        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F2F7]">
                            <div className="text-lg font-bold">Жалоба на товар</div>
                            <button
                                type="button"
                                onClick={closeReportModal}
                                className="w-10 h-10 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] transition flex items-center justify-center text-text-secondary"
                                aria-label="Закрыть"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {reportError && <div className="text-sm text-[#FF3B30]">{reportError}</div>}
                            {reportSuccess && <div className="text-sm text-[#34C759]">{reportSuccess}</div>}

                            <label className="block">
                                <div className="text-sm font-medium text-text-secondary mb-2">Причина</div>
                                <select
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    className="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 outline-none"
                                >
                                    {REPORT_REASONS.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <div className="text-sm font-medium text-text-secondary mb-2">Комментарий</div>
                                <textarea
                                    value={reportDescription}
                                    onChange={(e) => setReportDescription(e.target.value)}
                                    rows={4}
                                    className="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 outline-none resize-none"
                                    placeholder="Опишите, что именно не так"
                                />
                            </label>

                            <div className="flex justify-end gap-3">
                                <Button variant="secondary" onClick={closeReportModal}>
                                    Отмена
                                </Button>
                                <Button onClick={handleSubmitReport}>Отправить</Button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}