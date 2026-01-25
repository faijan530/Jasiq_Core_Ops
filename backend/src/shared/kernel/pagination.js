import { badRequest } from './errors.js';

export function parsePagination(query) {
  const pageRaw = query.page ?? '1';
  const pageSizeRaw = query.pageSize ?? '20';

  const page = Number(pageRaw);
  const pageSize = Number(pageSizeRaw);

  if (!Number.isInteger(page) || page < 1) throw badRequest('Invalid page');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) throw badRequest('Invalid pageSize');

  return { page, pageSize, offset: (page - 1) * pageSize, limit: pageSize };
}

export function pagedResponse({ items, total, page, pageSize }) {
  return {
    items,
    page,
    pageSize,
    total
  };
}
