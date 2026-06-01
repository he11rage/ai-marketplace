import { Link } from 'react-router-dom';
import Button from './ui/Button';

export default function CategoryApprovalRequiredModal({ open, onClose, categoryName }) {
  if (!open) return null;

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
        aria-labelledby="category-approval-required-title"
      >
        <div className="p-5 border-b border-[#F2F2F7]">
          <h3 id="category-approval-required-title" className="text-lg font-bold">
            Сначала одобрите категорию
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-text-primary">
            Товар нельзя принять, пока не проверена кастомная категория
            {categoryName ? (
              <>
                {' '}
                <span className="font-semibold">«{categoryName}»</span>
              </>
            ) : ''}
            . Одобрите категорию в очереди категорий, затем вернитесь к товару.
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Закрыть
            </Button>
            <Link
              to="/admin/moderation/categories"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#007AFF] text-white text-sm font-semibold hover:bg-[#0066DB] transition"
              onClick={onClose}
            >
              Очередь категорий
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
