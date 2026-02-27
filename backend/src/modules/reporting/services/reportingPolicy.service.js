import { forbidden } from '../../../shared/kernel/errors.js';
import { getSystemConfigValue } from '../../../shared/kernel/systemConfig.js';

function toBool(value) {
  if (value === null || value === undefined) return false;
  const v = String(value).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'enabled';
}

export async function readReportingConfig(pool) {
  const keys = [
    'REPORTING_ENABLED',
    'REPORTING_EXPORT_CSV_ENABLED',
    'REPORTING_PAYROLL_INCLUDED_IN_PNL',
    'REPORTING_DIVISION_VIEW_ENABLED',
    'REPORTING_CONSOLIDATED_VIEW_ENABLED'
  ];

  const values = {};
  for (const k of keys) {
    values[k] = await getSystemConfigValue(pool, k);
  }

  return {
    reportingEnabled: toBool(values.REPORTING_ENABLED),
    exportCsvEnabled: toBool(values.REPORTING_EXPORT_CSV_ENABLED),
    payrollAllowedInPnl: toBool(values.REPORTING_PAYROLL_INCLUDED_IN_PNL),
    divisionViewEnabled: toBool(values.REPORTING_DIVISION_VIEW_ENABLED),
    consolidatedViewEnabled: toBool(values.REPORTING_CONSOLIDATED_VIEW_ENABLED)
  };
}

export function assertReportingEnabled(cfg) {
  if (!cfg?.reportingEnabled) throw forbidden('Reporting is disabled');
}

export function assertCsvExportEnabled(cfg) {
  if (!cfg?.exportCsvEnabled) throw forbidden('CSV export is disabled');
}
