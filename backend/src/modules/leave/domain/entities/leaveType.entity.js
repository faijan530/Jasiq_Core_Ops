import { badRequest } from '../../../../shared/kernel/errors.js';

export class LeaveType {
  constructor(row) {
    if (!row?.id) throw badRequest('Leave type id is required');
    if (!row?.code) throw badRequest('Leave type code is required');
    if (!row?.name) throw badRequest('Leave type name is required');

    this.id = row.id;
    this.code = String(row.code).trim().toUpperCase();
    this.name = String(row.name).trim();
    this.isPaid = !!row.is_paid;
    this.supportsHalfDay = row.supports_half_day !== false;
    this.affectsPayroll = !!row.affects_payroll;
    this.deductionRule = row.deduction_rule || null;
    this.isActive = row.is_active !== false;
    this.version = Number(row.version || 1);
  }
}
