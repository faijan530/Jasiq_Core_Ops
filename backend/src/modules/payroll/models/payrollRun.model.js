import { badRequest } from '../../../shared/kernel/errors.js';

export const PAYROLL_RUN_STATUS = {
  DRAFT: 'DRAFT',
  REVIEWED: 'REVIEWED',
  LOCKED: 'LOCKED',
  PAID: 'PAID',
  CLOSED: 'CLOSED'
};

export class PayrollRun {
  constructor(row) {
    this.row = row;
  }

  get id() {
    return this.row?.id;
  }

  get status() {
    return this.row?.status;
  }

  assertStatus(expected) {
    const exp = String(expected);
    const actual = String(this.status || '');
    if (actual !== exp) throw badRequest(`Payroll run must be ${exp}`);
  }
}
