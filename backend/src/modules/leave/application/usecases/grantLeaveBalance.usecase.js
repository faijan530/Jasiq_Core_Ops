import crypto from 'node:crypto';

import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict } from '../../../../shared/kernel/errors.js';

import { readLeaveConfig, assertLeaveEnabled } from '../../domain/services/leavePolicy.service.js';
import { calculateAvailableBalance } from '../../domain/services/balanceCalculator.service.js';

import { getLeaveTypeById } from '../../infrastructure/persistence/leaveType.repository.pg.js';
import { getLeaveBalance, insertLeaveBalance, updateLeaveBalance } from '../../infrastructure/persistence/leaveBalance.repository.pg.js';
import { assertActorCanAccessEmployee } from './_access.js';

export async function grantLeaveBalanceUsecase(pool, { body, actorId, requestId }) {
  const cfg = await readLeaveConfig(pool);
  assertLeaveEnabled(cfg);

  const employeeId = body.employeeId;
  const leaveTypeId = body.leaveTypeId;
  const year = Number(body.year);
  if (!employeeId) throw badRequest('employeeId is required');
  if (!leaveTypeId) throw badRequest('leaveTypeId is required');
  if (!Number.isInteger(year)) throw badRequest('Invalid year');

  const openingBalance = Number(body.openingBalance || 0);
  const grantAmount = Number(body.grantAmount || 0);
  if (openingBalance < 0 || grantAmount < 0) throw badRequest('Invalid balance amounts');

  const trimmedReason = String(body.reason || '').trim();
  if (!trimmedReason) throw badRequest('Reason is required');

  return withTransaction(pool, async (client) => {
    await assertActorCanAccessEmployee(client, { actorId, permissionCode: 'LEAVE_BALANCE_GRANT', employeeId });

    const lt = await getLeaveTypeById(client, { id: leaveTypeId });
    if (!lt || lt.is_active === false) throw badRequest('Leave type not found');

    const existing = await getLeaveBalance(client, { employeeId, leaveTypeId, year, forUpdate: true });

    if (!existing) {
      const available = calculateAvailableBalance({ openingBalance, grantedBalance: grantAmount, consumedBalance: 0 });
      const inserted = await insertLeaveBalance(client, {
        id: crypto.randomUUID(),
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        year,
        opening_balance: openingBalance,
        granted_balance: grantAmount,
        consumed_balance: 0,
        available_balance: available,
        actor_id: actorId
      });

      await writeAuditLog(client, {
        requestId,
        entityType: 'LEAVE_BALANCE',
        entityId: inserted.id,
        action: 'LEAVE_BALANCE_GRANT',
        beforeData: null,
        afterData: {
          employee_id: inserted.employee_id,
          leave_type_id: inserted.leave_type_id,
          year: inserted.year,
          opening_balance: inserted.opening_balance,
          granted_balance: inserted.granted_balance,
          consumed_balance: inserted.consumed_balance,
          available_balance: inserted.available_balance
        },
        actorId,
        actorRole: null,
        reason: trimmedReason
      });

      return inserted;
    }

    const nextOpening = body.openingBalance !== undefined ? openingBalance : Number(existing.opening_balance || 0);
    const nextGranted = Number(existing.granted_balance || 0) + grantAmount;
    const nextConsumed = Number(existing.consumed_balance || 0);
    const nextAvailable = calculateAvailableBalance({
      openingBalance: nextOpening,
      grantedBalance: nextGranted,
      consumedBalance: nextConsumed
    });

    const updated = await updateLeaveBalance(client, {
      id: existing.id,
      openingBalance: nextOpening,
      grantedBalance: nextGranted,
      consumedBalance: nextConsumed,
      availableBalance: nextAvailable,
      actorId,
      expectedVersion: existing.version
    });

    if (!updated) throw conflict('Version conflict');

    await writeAuditLog(client, {
      requestId,
      entityType: 'LEAVE_BALANCE',
      entityId: existing.id,
      action: 'LEAVE_BALANCE_GRANT',
      beforeData: {
        employee_id: existing.employee_id,
        leave_type_id: existing.leave_type_id,
        year: existing.year,
        opening_balance: existing.opening_balance,
        granted_balance: existing.granted_balance,
        consumed_balance: existing.consumed_balance,
        available_balance: existing.available_balance,
        version: existing.version
      },
      afterData: {
        employee_id: updated.employee_id,
        leave_type_id: updated.leave_type_id,
        year: updated.year,
        opening_balance: updated.opening_balance,
        granted_balance: updated.granted_balance,
        consumed_balance: updated.consumed_balance,
        available_balance: updated.available_balance,
        version: updated.version
      },
      actorId,
      actorRole: null,
      reason: trimmedReason
    });

    return updated;
  });
}
