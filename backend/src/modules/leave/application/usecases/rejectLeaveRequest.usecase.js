import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict } from '../../../../shared/kernel/errors.js';

import { readLeaveConfig, assertLeaveEnabled, assertMonthsOpenForRange } from '../../domain/services/leavePolicy.service.js';
import { getLeaveRequestById, updateLeaveRequestStatus } from '../../infrastructure/persistence/leaveRequest.repository.pg.js';
import { assertActorCanAccessEmployee } from './_access.js';

export async function rejectLeaveRequestUsecase(pool, { id, reason, actorId, requestId }) {
  const cfg = await readLeaveConfig(pool);
  assertLeaveEnabled(cfg);

  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) throw badRequest('Reason is required');

  return withTransaction(pool, async (client) => {
    const before = await getLeaveRequestById(client, { id, forUpdate: true });
    if (!before) throw badRequest('Leave request not found');
    
    // Allow rejection from PENDING_L1, PENDING_L2, or legacy SUBMITTED (mapped to PENDING_L1)
    if (!['PENDING_L1', 'PENDING_L2', 'SUBMITTED'].includes(before.status)) {
      throw badRequest('Leave request is not pending approval');
    }

    const required = cfg.approvalLevels === 1 ? 'LEAVE_APPROVE_L1' : (before.approved_l1_at ? 'LEAVE_APPROVE_L2' : 'LEAVE_APPROVE_L1');
    await assertActorCanAccessEmployee(client, { actorId, permissionCode: required, employeeId: before.employee_id });

    await assertMonthsOpenForRange(client, {
      startDate: before.start_date,
      endDate: before.end_date,
      actorId,
      overrideReason: trimmedReason
    });

    const updated = await updateLeaveRequestStatus(client, {
      id,
      status: 'REJECTED',
      fields: {
        rejected_by: actorId,
        rejected_at: new Date(),
        rejection_reason: trimmedReason
      },
      expectedVersion: before.version
    });
    if (!updated) throw conflict('Version conflict');

    await writeAuditLog(client, {
      requestId,
      entityType: 'LEAVE_REQUEST',
      entityId: id,
      action: 'LEAVE_REQUEST_REJECT',
      beforeData: { status: before.status },
      afterData: { status: updated.status },
      actorId,
      actorRole: null,
      reason: trimmedReason
    });

    return updated;
  });
}
