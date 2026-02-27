import { asyncHandler } from '../../../../shared/kernel/asyncHandler.js';

import Joi from 'joi';

import { validate } from '../../../../shared/kernel/validation.js';
import { getPayrollReportsSummaryService, getPayrollReportsMonthSummaryService } from '../services/financeReports.service.js';

const monthSchema = Joi.object({
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).required()
});

export function financeReportsController({ pool }) {
  return {
    summary: asyncHandler(async (req, res) => {
      const items = await getPayrollReportsSummaryService(pool);
      res.json({ items });
    }),

    monthSummary: asyncHandler(async (req, res) => {
      const query = validate(monthSchema, req.query);
      const item = await getPayrollReportsMonthSummaryService(pool, { month: query.month });
      res.json(item);
    })
  };
}
