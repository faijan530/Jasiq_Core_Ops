import { asyncHandler } from '../../../../shared/kernel/asyncHandler.js';

import { getFinanceDashboardService } from '../services/financeDashboard.service.js';

export function financeDashboardController({ pool }) {
  return {
    get: asyncHandler(async (req, res) => {
      const item = await getFinanceDashboardService(pool);
      res.json(item);
    })
  };
}
