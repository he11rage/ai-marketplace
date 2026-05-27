import Button from './Button';

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);

  if (currentPage > 1) {
    pages.add(currentPage - 1);
  }
  if (currentPage < totalPages) {
    pages.add(currentPage + 1);
  }

  return [...pages].sort((a, b) => a - b);
}

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Пагинация">
      <Button
        variant="secondary"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Назад
      </Button>

      <div className="flex flex-wrap items-center gap-1">
        {visiblePages.map((page, index) => {
          const previousPage = visiblePages[index - 1];
          const showEllipsis = previousPage && page - previousPage > 1;

          return (
            <span key={page} className="flex items-center gap-1">
              {showEllipsis && <span className="px-2 text-text-secondary">…</span>}
              <button
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                className={`min-w-10 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  page === currentPage
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-white border border-[#E5E5EA] text-text-secondary hover:text-text-primary'
                }`}
              >
                {page}
              </button>
            </span>
          );
        })}
      </div>

      <Button
        variant="secondary"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Вперёд
      </Button>
    </nav>
  );
}
