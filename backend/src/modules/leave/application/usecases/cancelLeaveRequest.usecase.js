import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict } from '../../../../shared/kernel/errors.js';

import { readLeaveConfig, assertLeaveEnabled, assertMonthsOpenForRange } from '../../domain/services/leavePolicy.service.js';
import { calculateAvailableBalance } from '../../domain/services/balanceCalculator.service.js';

import { getLeaveRequestById, updateLeaveRequestStatus } from '../../infrastructure/persistence/leaveRequest.repository.pg.js';
import { getLeaveTypeById } from '../../infrastructure/persistence/leaveType.repository.pg.js';
import { getLeaveBalance, updateLeaveBalance } from '../../infrastructure/persistence/leaveBalance.repository.pg.js';
import { revertLeaveInAttendance } from '../../infrastructure/integrations/attendanceSync.adapter.js';

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

export async function cancelLeaveRequestUsecase(pool, { id, reason, actorId, requestId }) {
  const cfg = await readLeaveConfig(pool);
  assertLeaveEnabled(cfg);

  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) throw badRequest('Reason is required');

  return withTransaction(pool, async (client) => {
    const before = await getLeaveRequestById(client, { id, forUpdate: true });
    if (!before) throw badRequest('Leave request not found');

    if (before.status === 'CANCELLED') return before;
    if (before.status === 'REJECTED') throw badRequest('Cannot cancel a rejected request');

    // Self-cancel allowed; otherwise enforce scoped permission.
    if (String(before.employee_id) !== String(actorId)) {
      await assertActorCanAccessEmployee(client, { actorId, permissionCode: 'LEAVE_REQUEST_CANCEL', employeeId: before.employee_id });
    }

    await assertMonthsOpenForRange(client, {
      startDate: before.start_date,
      endDate: before.end_date,
      actorId,
      overrideReason: trimmedReason
    });

    const lt = await getLeaveTypeById(client, { id: before.leave_type_id });
    if (!lt) throw badRequest('Leave type not found');

    // If previously approved, restore balance and revert attendance (best-effort per policy).
    if (before.status === 'APPROVED') {
      if (lt.is_paid) {
        const bal = await getLeaveBalance(client, {
          employeeId: before.employee_id,
          leaveTypeId: before.leave_type_id,
          year: yearOf(before.start_date),
          forUpdate: true
        });
        if (bal) {
          const units = Number(before.units || 0);
          const nextConsumed = Math.max(0, Number(bal.consumed_balance || 0) - units);
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
            action: 'LEAVE_BALANCE_RESTORE',
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
            reason: trimmedReason
          });
        }
      }

      const dates = eachDay(before.start_date, before.end_date);
      for (const d of dates) {
        await revertLeaveInAttendance(client, {
          employeeId: before.employee_id,
          dateIso: d,
          leaveRequestId: id,
          actorId,
          requestId
        });
      }
    }

    const updated = await updateLeaveRequestStatus(client, {
      id,
      status: 'CANCELLED',
      fields: {
        cancelled_by: actorId,
        cancelled_at: new Date(),
        cancel_reason: trimmedReason
      },
      expectedVersion: before.version
    });
    if (!updated) throw conflict('Version conflict');

    await writeAuditLog(client, {
      requestId,
      entityType: 'LEAVE_REQUEST',
      entityId: id,
      action: 'LEAVE_REQUEST_CANCEL',
      beforeData: { status: before.status },
      afterData: { status: updated.status },
      actorId,
      actorRole: null,
      reason: trimmedReason
    });

    return updated;
  });
}
