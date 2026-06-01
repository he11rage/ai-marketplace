import { useEffect, useState } from 'react';
import Button from './ui/Button';

export default function ModerationActionModal({
  open,
  onClose,
  title,
  description,
  entityName,
  entityLabel = 'Объект',
  confirmLabel = 'Подтвердить',
  confirmVariant = 'primary',
  onConfirm,
  isSubmitting = false,
}) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(reason.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="moderation-action-title"
      >
        <div className="p-5 border-b border-[#F2F2F7]">
          <h3 id="moderation-action-title" className="text-lg font-bold">
            {title}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {description && (
            <p className="text-sm text-text-primary">{description}</p>
          )}
          {entityName && (
            <p className="text-sm text-text-secondary">
              {entityLabel}: <span className="font-semibold text-text-primary">«{entityName}»</span>
            </p>
          )}
          <div>
            <label htmlFor="moderation-action-reason" className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
              Причина (необязательно)
            </label>
            <textarea
              id="moderation-action-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Укажите причину для продавца…"
              className="w-full px-3 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm outline-none focus:bg-white focus:border-[#007AFF] transition resize-y min-h-[80px]"
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button type="submit" variant={confirmVariant} disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение…' : confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
