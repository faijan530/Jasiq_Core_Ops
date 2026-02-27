import { badRequest } from '../../../shared/kernel/errors.js';

import { toCsv, storeCsvTemp } from './csvExporter.service.js';
import { readReportingConfig, assertReportingEnabled, assertCsvExportEnabled } from './reportingPolicy.service.js';

import {
  getRevenueReportService,
  getExpenseReportService,
  getPnlReportService,
  getReceivablesReportService,
  getPayablesReportService,
  getCashflowReportService
} from './reporting.service.js';

function reportToCsv(reportType, items) {
  const type = String(reportType || '').toUpperCase();

  if (type === 'CASHFLOW') {
    const headers = ['day', 'inflow', 'outflow', 'net'];
    const rows = (items || []).map((r) => [r.day, r.inflow, r.outflow, r.net]);
    return { headers, rows };
  }

  if (type === 'PNL') {
    const headers = ['month', 'division_id', 'division_name', 'category_id', 'category_name', 'revenue', 'expense', 'payroll', 'profit'];
    const rows = (items || []).map((r) => [
      r.month,
      r.division_id || r.divisionId,
      r.division_name || r.divisionName,
      r.category_id || r.categoryId,
      r.category_name || r.categoryName,
      r.revenue,
      r.expense,
      r.payroll,
      r.profit
    ]);
    return { headers, rows };
  }

  // Default revenue/expense/receivables/payables
  const headers = ['month', 'division_id', 'division_name', 'category_id', 'category_name', 'total_amount', 'paid_amount', 'due_amount', 'record_count'];
  const rows = (items || []).map((r) => [
    r.month,
    r.division_id,
    r.division_name,
    r.category_id,
    r.category_name,
    r.total_amount,
    r.paid_amount,
    r.due_amount,
    r.record_count
  ]);

  return { headers, rows };
}

export async function exportReportCsvService(pool, { reportType, filter, actorId }) {
  const cfg = await readReportingConfig(pool);
  assertReportingEnabled(cfg);
  assertCsvExportEnabled(cfg);

  const type = String(reportType || '').toUpperCase();

  let payload;
  if (type === 'REVENUE') payload = await getRevenueReportService(pool, { filter, actorId });
  else if (type === 'EXPENSE') payload = await getExpenseReportService(pool, { filter, actorId });
  else if (type === 'PNL') payload = await getPnlReportService(pool, { filter, actorId });
  else if (type === 'RECEIVABLES') payload = await getReceivablesReportService(pool, { filter, actorId });
  else if (type === 'PAYABLES') payload = await getPayablesReportService(pool, { filter, actorId });
  else if (type === 'CASHFLOW') payload = await getCashflowReportService(pool, { filter, actorId });
  else throw badRequest('Invalid reportType');

  const { headers, rows } = reportToCsv(type, payload.items);
  const csvText = toCsv({ headers, rows });

  const base = `report_${type.toLowerCase()}_${filter.from}_${filter.to}`;
  const stored = await storeCsvTemp({ fileBaseName: base, csvText });

  return {
    reportType: type,
    fileName: stored.fileName,
    relPath: stored.relPath,
    sizeBytes: stored.sizeBytes,
    rowCount: rows.length
  };
}
