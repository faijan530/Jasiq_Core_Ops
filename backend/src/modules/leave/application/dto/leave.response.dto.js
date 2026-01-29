import { pagedResponse } from '../../../../shared/kernel/pagination.js';

export function pagedItems({ items, total, page, pageSize }) {
  return pagedResponse({ items, total, page, pageSize });
}
