import { readReportingConfig, assertReportingEnabled } from './reportingPolicy.service.js';
import { assertCanAccessDivision } from './divisionScopePolicy.service.js';

import { queryRevenueReport } from '../repositories/revenueReport.repository.js';
import { queryExpenseReport } from '../repositories/expenseReport.repository.js';
import { queryPnl } from '../repositories/pnl.repository.js';
import { queryReceivables } from '../repositories/receivables.repository.js';
import { queryPayables } from '../repositories/payables.repository.js';
import { queryCashflow } from '../repositories/cashflow.repository.js';

export async function getRevenueReportService(pool, { filter, actorId }) {
  const cfg = await readReportingConfig(pool);
  assertReportingEnabled(cfg);
  if (filter.divisionId) await assertCanAccessDivision(pool, { actorId, divisionId: filter.divisionId });
  const rows = await queryRevenueReport(pool, filter);
  return { items: rows, filter };
}

export async function getExpenseReportService(pool, { filter, actorId }) {
  const cfg = await readReportingConfig(pool);
  assertReportingEnabled(cfg);
  if (filter.divisionId) await assertCanAccessDivision(pool, { actorId, divisionId: filter.divisionId });
  const rows = await queryExpenseReport(pool, filter);
  return { items: rows, filter };
}

export async function getPnlReportService(pool, { filter, actorId }) {
  const cfg = await readReportingConfig(pool);
  assertReportingEnabled(cfg);
  if (filter.divisionId) await assertCanAccessDivision(pool, { actorId, divisionId: filter.divisionId });

  const includePayroll = filter.includePayroll === null ? cfg.payrollAllowedInPnl : Boolean(filter.includePayroll);
  const rows = await queryPnl(pool, { ...filter, includePayroll });
  return { items: rows, filter: { ...filter, includePayroll } };
}

export async function getReceivablesReportService(pool, { filter, actorId }) {
  const cfg = await readReportingConfig(pool);
  assertReportingEnabled(cfg);
  if (filter.divisionId) await assertCanAccessDivision(pool, { actorId, divisionId: filter.divisionId });
  const rows = await queryReceivables(pool, filter);
  return { items: rows, filter };
}

export async function getPayablesReportService(pool, { filter, actorId }) {
  const cfg = await readReportingConfig(pool);
  assertReportingEnabled(cfg);
  if (filter.divisionId) await assertCanAccessDivision(pool, { actorId, divisionId: filter.divisionId });
  const rows = await queryPayables(pool, filter);
  return { items: rows, filter };
}

export async function getCashflowReportService(pool, { filter, actorId }) {
  const cfg = await readReportingConfig(pool);
  assertReportingEnabled(cfg);
  if (filter.divisionId) await assertCanAccessDivision(pool, { actorId, divisionId: filter.divisionId });

  const includePayroll = filter.includePayroll === null ? cfg.payrollAllowedInPnl : Boolean(filter.includePayroll);
  const items = await queryCashflow(pool, { ...filter, includePayroll });
  return { items, filter: { ...filter, includePayroll } };
}
