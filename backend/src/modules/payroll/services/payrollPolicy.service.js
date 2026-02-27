import { badRequest } from '../../../shared/kernel/errors.js';

import { PAYROLL_RUN_STATUS } from '../models/payrollRun.model.js';

const allowed = {
  [PAYROLL_RUN_STATUS.DRAFT]: [PAYROLL_RUN_STATUS.REVIEWED],
  [PAYROLL_RUN_STATUS.REVIEWED]: [PAYROLL_RUN_STATUS.LOCKED],
  [PAYROLL_RUN_STATUS.LOCKED]: [PAYROLL_RUN_STATUS.PAID],
  [PAYROLL_RUN_STATUS.PAID]: [PAYROLL_RUN_STATUS.CLOSED],
  [PAYROLL_RUN_STATUS.CLOSED]: []
};

export function assertPayrollStatus(status) {
  const s = String(status || '').toUpperCase();
  const values = Object.values(PAYROLL_RUN_STATUS);
  if (!values.includes(s)) throw badRequest('Invalid payroll status');
  return s;
}

export function assertTransition({ fromStatus, toStatus }) {
  const from = assertPayrollStatus(fromStatus);
  const to = assertPayrollStatus(toStatus);
  const ok = (allowed[from] || []).includes(to);
  if (!ok) throw badRequest(`Invalid payroll transition: ${from} → ${to}`);
  return { from, to };
}

export function assertEditableStatus(status) {
  const s = assertPayrollStatus(status);
  if (![PAYROLL_RUN_STATUS.DRAFT, PAYROLL_RUN_STATUS.REVIEWED].includes(s)) {
    throw badRequest('Payroll run is immutable');
  }
}
