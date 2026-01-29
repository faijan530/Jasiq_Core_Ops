import { badRequest } from '../../../../shared/kernel/errors.js';

export class LeaveBalance {
  constructor(row) {
    if (!row?.id) throw badRequest('Leave balance id is required');
    if (!row?.employee_id) throw badRequest('employee_id is required');
    if (!row?.leave_type_id) throw badRequest('leave_type_id is required');
    if (row?.year === undefined || row?.year === null) throw badRequest('year is required');

    this.id = row.id;
    this.employeeId = row.employee_id;
    this.leaveTypeId = row.leave_type_id;
    this.year = Number(row.year);
    this.openingBalance = Number(row.opening_balance || 0);
    this.grantedBalance = Number(row.granted_balance || 0);
    this.consumedBalance = Number(row.consumed_balance || 0);
    this.availableBalance = Number(row.available_balance || 0);
    this.version = Number(row.version || 1);
  }
}
