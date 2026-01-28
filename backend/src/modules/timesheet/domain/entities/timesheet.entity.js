import { badRequest } from '../../../../shared/kernel/errors.js';
import { assertPeriod, assertPeriodType } from '../valueObjects/period.vo.js';
import { assertStatusTransition, TIMESHEET_STATUS } from '../valueObjects/timesheetStatus.vo.js';

export class TimesheetHeader {
  constructor(row) {
    if (!row) throw badRequest('Timesheet not found');

    this.id = row.id;
    this.employeeId = row.employee_id;
    this.periodType = assertPeriodType(row.period_type);
    this.periodStart = row.period_start;
    this.periodEnd = row.period_end;
    assertPeriod({ periodType: this.periodType, periodStart: this.periodStart, periodEnd: this.periodEnd });

    this.status = row.status;
    this.locked = Boolean(row.locked);
    this.version = Number(row.version);

    this.approvedL1At = row.approved_l1_at;
    this.approvedL2At = row.approved_l2_at;
  }

  ensureMutableForWorklog() {
    if (this.locked) throw badRequest('Timesheet is locked');
    const s = String(this.status);
    if (s !== TIMESHEET_STATUS.DRAFT && s !== TIMESHEET_STATUS.REVISION_REQUIRED && s !== TIMESHEET_STATUS.REJECTED) {
      throw badRequest('Timesheet is not editable');
    }
  }

  transitionTo(toStatus) {
    assertStatusTransition(this.status, toStatus);
    this.status = toStatus;
  }
}
