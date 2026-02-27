import crypto from 'node:crypto';

import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict } from '../../../../shared/kernel/errors.js';

import {
  readLeaveConfig,
  assertLeaveEnabled,
  assertDateRange,
  assertBackdatedAllowed,
  assertHalfDayAllowed,
  assertMonthsOpenForRange
} from '../../domain/services/leavePolicy.service.js';
import { calculateLeaveUnits } from '../../domain/services/balanceCalculator.service.js';

import { getLeaveTypeById } from '../../infrastructure/persistence/leaveType.repository.pg.js';
import { findOverlappingLeaveRequests, insertLeaveRequest } from '../../infrastructure/persistence/leaveRequest.repository.pg.js';
import { getLeaveBalance, updateLeaveBalance } from '../../infrastructure/persistence/leaveBalance.repository.pg.js';
import { calculateAvailableBalance } from '../../domain/services/balanceCalculator.service.js';

import { assertActorCanAccessEmployee, getTodayDateOnly } from './_access.js';

function yearOf(dateIso) {
  return Number(String(dateIso).slice(0, 4));
}

export async function createLeaveRequestUsecase(pool, { body, actorId, requestId }) {
  const cfg = await readLeaveConfig(pool);
  assertLeaveEnabled(cfg);

  const employeeId = body.employeeId;
  const leaveTypeId = body.leaveTypeId;
  if (!employeeId) throw badRequest('employeeId is required');
  if (!leaveTypeId) throw badRequest('leaveTypeId is required');

  const { startDate, endDate } = assertDateRange({ startDate: body.startDate, endDate: body.endDate });

  const unit = String(body.unit || '').toUpperCase();
  if (unit === 'HALF_DAY') assertHalfDayAllowed(cfg);

  const todayDate = await getTodayDateOnly(pool);
  if (!todayDate) throw badRequest('Failed to read today date');
  assertBackdatedAllowed(cfg, { startDate, todayDate });

  const halfDayPart = body.halfDayPart ? String(body.halfDayPart).toUpperCase() : null;
  if (unit === 'HALF_DAY' && !halfDayPart) throw badRequest('halfDayPart is required for HALF_DAY');

  const trimmedReason = String(body.reason || '').trim();
  if (!trimmedReason) throw badRequest('Reason is required');

  if (yearOf(startDate) !== yearOf(endDate)) {
    throw badRequest('Leave requests cannot span multiple years');
  }

  return withTransaction(pool, async (client) => {
    await assertActorCanAccessEmployee(client, { actorId, permissionCode: 'LEAVE_APPLY_SELF', employeeId });

    await assertMonthsOpenForRange(client, {
      startDate,
      endDate,
      actorId,
      overrideReason: trimmedReason
    });

    const lt = await getLeaveTypeById(client, { id: leaveTypeId });
    if (!lt || lt.is_active === false) throw badRequest('Leave type not found');

    const overlapId = await findOverlappingLeaveRequests(client, { employeeId, startDate, endDate, excludeId: null });
    if (overlapId) throw conflict('Overlapping leave request exists');

    const units = calculateLeaveUnits({ startDate, endDate, unit });

    // Paid leave requires sufficient balance.
    if (lt.is_paid) {
      const bal = await getLeaveBalance(client, { employeeId, leaveTypeId, year: yearOf(startDate), forUpdate: true });
      if (!bal) throw badRequest('Leave balance not found');

      const available = Number(bal.available_balance || 0);
      if (available < units) throw badRequest('Insufficient leave balance');

      // No balance update at submission time; it is updated on final approval.
    }

    const inserted = await insertLeaveRequest(client, {
      id: crypto.randomUUID(),
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      unit,
      half_day_part: unit === 'HALF_DAY' ? halfDayPart : null,
      units,
      reason: trimmedReason,
      status: 'PENDING_L1'  // Changed from 'SUBMITTED' to 'PENDING_L1'
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'LEAVE_REQUEST',
      entityId: inserted.id,
      action: 'LEAVE_REQUEST_CREATE',
      beforeData: null,
      afterData: {
        employee_id: inserted.employee_id,
        leave_type_id: inserted.leave_type_id,
        start_date: inserted.start_date,
        end_date: inserted.end_date,
        unit: inserted.unit,
        half_day_part: inserted.half_day_part,
        units: inserted.units,
        status: inserted.status
      },
      actorId,
      actorRole: null,
      reason: trimmedReason
    });

    return inserted;
  });
}
