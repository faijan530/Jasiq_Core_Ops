import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict } from '../../../../shared/kernel/errors.js';

import { readLeaveConfig, assertLeaveEnabled, assertMonthsOpenForRange } from '../../domain/services/leavePolicy.service.js';
import { calculateAvailableBalance } from '../../domain/services/balanceCalculator.service.js';

import { getLeaveRequestById, updateLeaveRequestStatus } from '../../infrastructure/persistence/leaveRequest.repository.pg.js';
import { getLeaveTypeById } from '../../infrastructure/persistence/leaveType.repository.pg.js';
import { getLeaveBalance, updateLeaveBalance } from '../../infrastructure/persistence/leaveBalance.repository.pg.js';
import { applyLeaveToAttendance } from '../../infrastructure/integrations/attendanceSync.adapter.js';

import { assertActorCanAccessEmployee } from './_access.js';

function yearOf(dateIso) {
  return Number(String(dateIso).slice(0, 4));
}

function eachDay(startIso, endIso) {
  const start = new Date(`${startIso}T00:00:00.000Z`);
  const end = new Date(`${endIso}T00:00:00.000Z`);
  const days = [];
  const cur = new Date(start.getTime());
  while (cur.getTime() <= end.getTime()) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

export async function approveLeaveRequestUsecase(pool, { id, actorId, requestId, reason }) {
  const cfg = await readLeaveConfig(pool);
  assertLeaveEnabled(cfg);

  const trimmedReason = String(reason || '').trim() || null;

  return withTransaction(pool, async (client) => {
    const before = await getLeaveRequestById(client, { id, forUpdate: true });
    if (!before) throw badRequest('Leave request not found');

    const isLegacyPendingL2 =
      cfg.approvalLevels === 2 &&
      before.status === 'APPROVED' &&
      before.approved_l1_at &&
      !before.approved_l2_at;

    // Allow approval from PENDING_L1, PENDING_L2, legacy SUBMITTED (mapped to PENDING_L1),
    // and legacy inconsistent APPROVED-without-L2 (treated as pending L2).
    if (!['PENDING_L1', 'PENDING_L2', 'SUBMITTED'].includes(before.status) && !isLegacyPendingL2) {
      throw badRequest('Leave request is not pending approval');
    }

    const required =
      cfg.approvalLevels === 1
        ? 'LEAVE_APPROVE_L1'
        : (before.approved_l1_at ? 'LEAVE_APPROVE_L2' : 'LEAVE_APPROVE_L1');
    await assertActorCanAccessEmployee(client, { actorId, permissionCode: required, employeeId: before.employee_id });

    await assertMonthsOpenForRange(client, {
      startDate: before.start_date,
      endDate: before.end_date,
      actorId,
      overrideReason: trimmedReason
    });

    // 2-level: first approval only stamps L1 and moves to PENDING_L2
    if (cfg.approvalLevels === 2 && !before.approved_l1_at) {
      const updated = await updateLeaveRequestStatus(client, {
        id,
        status: 'PENDING_L2',  // Changed from 'SUBMITTED' to 'PENDING_L2'
        fields: {
          approved_l1_by: actorId,
          approved_l1_at: new Date()
        },
        expectedVersion: before.version
      });
      if (!updated) throw conflict('Version conflict');

      await writeAuditLog(client, {
        requestId,
        entityType: 'LEAVE_REQUEST',
        entityId: id,
        action: 'LEAVE_REQUEST_APPROVE_L1',
        beforeData: { status: before.status, approved_l1_at: before.approved_l1_at },
        afterData: { status: updated.status, approved_l1_at: updated.approved_l1_at },
        actorId,
        actorRole: null,
        reason: trimmedReason
      });

      return updated;
    }

    // Legacy inconsistent state: already APPROVED but missing L2 stamp.
    // Treat as pending L2 and just stamp L2 approval.
    if (isLegacyPendingL2) {
      const updated = await updateLeaveRequestStatus(client, {
        id,
        status: 'APPROVED',
        fields: {
          approved_l2_by: actorId,
          approved_l2_at: new Date()
        },
        expectedVersion: before.version
      });
      if (!updated) throw conflict('Version conflict');

      await writeAuditLog(client, {
        requestId,
        entityType: 'LEAVE_REQUEST',
        entityId: id,
        action: 'LEAVE_REQUEST_APPROVE_L2',
        beforeData: { status: before.status, approved_l2_at: before.approved_l2_at },
        afterData: { status: updated.status, approved_l2_at: updated.approved_l2_at },
        actorId,
        actorRole: null,
        reason: trimmedReason
      });

      return updated;
    }

    const lt = await getLeaveTypeById(client, { id: before.leave_type_id });
    if (!lt || lt.is_active === false) throw badRequest('Leave type not found');

    // Final approval performs balance consume + attendance sync
    if (lt.is_paid) {
      const bal = await getLeaveBalance(client, { employeeId: before.employee_id, leaveTypeId: before.leave_type_id, year: yearOf(before.start_date), forUpdate: true });
      if (!bal) throw badRequest('Leave balance not found');

      const available = Number(bal.available_balance || 0);
      const units = Number(before.units || 0);
      if (available < units) throw badRequest('Insufficient leave balance');

      const nextConsumed = Number(bal.consumed_balance || 0) + units;
      const nextAvailable = calculateAvailableBalance({
        openingBalance: bal.opening_balance,
        grantedBalance: bal.granted_balance,
        consumedBalance: nextConsumed
      });

      const updatedBal = await updateLeaveBalance(client, {
        id: bal.id,
        openingBalance: bal.opening_balance,
        grantedBalance: bal.granted_balance,
        consumedBalance: nextConsumed,
        availableBalance: nextAvailable,
        actorId,
        expectedVersion: bal.version
      });
      if (!updatedBal) throw conflict('Version conflict');

      await writeAuditLog(client, {
        requestId,
        entityType: 'LEAVE_BALANCE',
        entityId: bal.id,
        action: 'LEAVE_BALANCE_CONSUME',
        beforeData: {
          employee_id: bal.employee_id,
          leave_type_id: bal.leave_type_id,
          year: bal.year,
          consumed_balance: bal.consumed_balance,
          available_balance: bal.available_balance
        },
        afterData: {
          employee_id: updatedBal.employee_id,
          leave_type_id: updatedBal.leave_type_id,
          year: updatedBal.year,
          consumed_balance: updatedBal.consumed_balance,
          available_balance: updatedBal.available_balance
        },
        actorId,
        actorRole: null,
        reason: null
      });
    }

    const fields = cfg.approvalLevels === 1
      ? { approved_l1_by: actorId, approved_l1_at: new Date() }
      : { approved_l2_by: actorId, approved_l2_at: new Date() };

    const updated = await updateLeaveRequestStatus(client, {
      id,
      status: 'APPROVED',
      fields,
      expectedVersion: before.version
    });
    if (!updated) throw conflict('Version conflict');

    // Apply leave to attendance only when status is APPROVED
    const dates = eachDay(before.start_date, before.end_date);
    for (const d of dates) {
      await applyLeaveToAttendance(client, {
        employeeId: before.employee_id,
        dateIso: d,
        leaveRequestId: id,
        halfDayPart: before.unit === 'HALF_DAY' ? before.half_day_part : null,
        actorId,
        requestId
      });
    }

    await writeAuditLog(client, {
      requestId,
      entityType: 'LEAVE_REQUEST',
      entityId: id,
      action: cfg.approvalLevels === 1 ? 'LEAVE_REQUEST_APPROVE' : 'LEAVE_REQUEST_APPROVE_L2',
      beforeData: { status: before.status },
      afterData: { status: updated.status },
      actorId,
      actorRole: null,
      reason: trimmedReason
    });

    return updated;
  });
}
