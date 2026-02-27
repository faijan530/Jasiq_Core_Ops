import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';

import { getOpsDashboardSummary } from '../services/opsDashboard.service.js';

export function opsDashboardController({ pool }) {
  return {
    summary: asyncHandler(async (req, res) => {
      const item = await getOpsDashboardSummary(pool);
      res.json({ item });
    })
  };
}
