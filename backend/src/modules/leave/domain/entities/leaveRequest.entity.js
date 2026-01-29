import { badRequest } from '../../../../shared/kernel/errors.js';
import { assertLeaveStatus } from '../valueObjects/leaveStatus.vo.js';
import { assertLeaveUnit, normalizeHalfDayPart, LEAVE_UNIT } from '../valueObjects/leaveUnit.vo.js';

export class LeaveRequest {
  constructor(row) {
    if (!row?.id) throw badRequest('Leave request id is required');
    if (!row?.employee_id) throw badRequest('employee_id is required');
    if (!row?.leave_type_id) throw badRequest('leave_type_id is required');
    if (!row?.start_date) throw badRequest('start_date is required');
    if (!row?.end_date) throw badRequest('end_date is required');

    this.id = row.id;
    this.employeeId = row.employee_id;
    this.leaveTypeId = row.leave_type_id;
    this.startDate = row.start_date;
    this.endDate = row.end_date;
    this.unit = assertLeaveUnit(row.unit);
    this.halfDayPart = normalizeHalfDayPart(row.half_day_part);
    this.units = Number(row.units || 0);
    this.reason = String(row.reason || '').trim();
    if (!this.reason) throw badRequest('Reason is required');
    this.status = assertLeaveStatus(row.status);

    if (this.unit === LEAVE_UNIT.HALF_DAY) {
      if (this.startDate !== this.endDate) throw badRequest('Half-day leave must be a single day');
      if (!this.halfDayPart) throw badRequest('halfDayPart is required for HALF_DAY');
      if (this.units !== 0.5) throw badRequest('Half-day units must be 0.5');
    }

    this.approvedL1By = row.approved_l1_by || null;
    this.approvedL1At = row.approved_l1_at || null;
    this.approvedL2By = row.approved_l2_by || null;
    this.approvedL2At = row.approved_l2_at || null;
    this.rejectedBy = row.rejected_by || null;
    this.rejectedAt = row.rejected_at || null;
    this.rejectionReason = row.rejection_reason || null;
    this.cancelledBy = row.cancelled_by || null;
    this.cancelledAt = row.cancelled_at || null;
    this.cancelReason = row.cancel_reason || null;
    this.version = Number(row.version || 1);
  }
}
