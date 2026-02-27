import { asyncHandler } from '../../../../shared/kernel/asyncHandler.js';
import { parsePagination, pagedResponse } from '../../../../shared/kernel/pagination.js';

import { listPayrollLedgerEntriesService } from '../services/financeLedger.service.js';

export function financeLedgerController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const query = {
        month: req.query.month ? String(req.query.month).trim() : null,
        type: req.query.type ? String(req.query.type).trim() : null,
        search: req.query.search ? String(req.query.search).trim() : null
      };

      const { items, total } = await listPayrollLedgerEntriesService(pool, { offset, limit, query });
      res.json(pagedResponse({ items, total, page, pageSize }));
    })
  };
}
