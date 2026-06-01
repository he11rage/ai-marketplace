export default function ModerationPreviewModal({
  open,
  onClose,
  title,
  description,
  imageUrl,
  imageAlt,
  children,
}) {
  if (!open) return null;

  const text = (description || '').trim();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="moderation-preview-title"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[#F2F2F7] shrink-0">
          <h3 id="moderation-preview-title" className="text-lg font-bold pr-2">
            {title}
          </h3>
          <button
            type="button"
            className="w-9 h-9 rounded-lg hover:bg-[#F2F2F7] transition text-lg shrink-0"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div className="aspect-[4/3] rounded-xl bg-[#F2F2F7] overflow-hidden flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={imageAlt || title || ''}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm text-text-secondary">Нет изображения</span>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
              Описание
            </div>
            {text ? (
              <p className="text-sm text-text-primary whitespace-pre-wrap">{text}</p>
            ) : (
              <p className="text-sm text-text-secondary italic">Описание не указано</p>
            )}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
