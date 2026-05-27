export const PRODUCTS_PAGE_SIZE = 12;

export function parseProductsResponse(data) {
  if (Array.isArray(data)) {
    return {
      results: data,
      count: data.length,
      next: null,
      previous: null,
    };
  }

  return {
    results: data.results ?? [],
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
  };
}

export function getPageFromPaginatedUrl(url) {
  if (!url) {
    return undefined;
  }

  try {
    const page = new URL(url).searchParams.get('page');
    if (!page) {
      return undefined;
    }
    const pageNumber = Number(page);
    return Number.isNaN(pageNumber) ? undefined : pageNumber;
  } catch {
    return undefined;
  }
}

export function getTotalPages(count, pageSize = PRODUCTS_PAGE_SIZE) {
  if (!count || count <= 0) {
    return 1;
  }
  return Math.ceil(count / pageSize);
}
