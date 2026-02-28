import { forbidden } from '../../../shared/kernel/errors.js';
import { getSystemConfigValues } from '../../../shared/kernel/systemConfig.js';

function toBool(value) {
  if (value === null || value === undefined) return false;
  const v = String(value).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'enabled';
}

function toInt(value, fallback) {
  const n = Number(String(value ?? '').trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

export async function readOpsConfig(pool) {
  const keys = [
    'OPS_INBOX_ENABLED',
    'ALERTS_ENABLED',
    'OVERRIDE_ENABLED',
    'DATA_QUALITY_CHECKS_ENABLED',
    'APPROVAL_SLA_HOURS'
  ];

  const values = await getSystemConfigValues(pool, keys);

  return {
    opsInboxEnabled: toBool(values.OPS_INBOX_ENABLED),
    alertsEnabled: toBool(values.ALERTS_ENABLED),
    overrideEnabled: toBool(values.OVERRIDE_ENABLED),
    dataQualityEnabled: toBool(values.DATA_QUALITY_CHECKS_ENABLED),
    approvalSlaHours: Math.max(1, toInt(values.APPROVAL_SLA_HOURS, 48))
  };
}

export function assertOpsInboxEnabled(cfg) {
  if (!cfg?.opsInboxEnabled) throw forbidden('Ops inbox is disabled');
}

export function assertAlertsEnabled(cfg) {
  if (!cfg?.alertsEnabled) throw forbidden('Alerts are disabled');
}

export function assertOverrideEnabled(cfg) {
  if (!cfg?.overrideEnabled) throw forbidden('Overrides are disabled');
}

export function assertDataQualityEnabled(cfg) {
  if (!cfg?.dataQualityEnabled) throw forbidden('Data quality checks are disabled');
}
