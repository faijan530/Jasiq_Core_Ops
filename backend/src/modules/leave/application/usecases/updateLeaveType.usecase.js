import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict } from '../../../../shared/kernel/errors.js';

import { readLeaveConfig, assertLeaveEnabled } from '../../domain/services/leavePolicy.service.js';
import { getLeaveTypeByCode, getLeaveTypeById, updateLeaveType } from '../../infrastructure/persistence/leaveType.repository.pg.js';

export async function updateLeaveTypeUsecase(pool, { id, body, actorId, requestId }) {
  const cfg = await readLeaveConfig(pool);
  assertLeaveEnabled(cfg);

  const expectedVersion = Number(body.version);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw badRequest('Invalid version');

  return withTransaction(pool, async (client) => {
    const before = await getLeaveTypeById(client, { id });
    if (!before) throw badRequest('Leave type not found');

    const patch = {};
    if (body.code !== undefined) patch.code = String(body.code).trim().toUpperCase();
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.isPaid !== undefined) patch.is_paid = !!body.isPaid;
    if (body.supportsHalfDay !== undefined) patch.supports_half_day = !!body.supportsHalfDay;
    if (body.affectsPayroll !== undefined) patch.affects_payroll = !!body.affectsPayroll;
    if (body.deductionRule !== undefined) patch.deduction_rule = body.deductionRule || null;
    if (body.isActive !== undefined) patch.is_active = !!body.isActive;

    if (patch.code) {
      const existing = await getLeaveTypeByCode(client, { code: patch.code });
      if (existing && String(existing.id) !== String(id)) throw conflict('Leave type code already exists');
    }

    const updated = await updateLeaveType(client, {
      id,
      patch,
      actorId,
      expectedVersion
    });

    if (!updated) throw conflict('Version conflict');

    await writeAuditLog(client, {
      requestId,
      entityType: 'LEAVE_TYPE',
      entityId: id,
      action: 'LEAVE_TYPE_UPDATE',
      beforeData: {
        id: before.id,
        code: before.code,
        name: before.name,
        is_paid: before.is_paid,
        supports_half_day: before.supports_half_day,
        affects_payroll: before.affects_payroll,
        deduction_rule: before.deduction_rule,
        is_active: before.is_active,
        version: before.version
      },
      afterData: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        is_paid: updated.is_paid,
        supports_half_day: updated.supports_half_day,
        affects_payroll: updated.affects_payroll,
        deduction_rule: updated.deduction_rule,
        is_active: updated.is_active,
        version: updated.version
      },
      actorId,
      actorRole: null,
      reason: null
    });

    return updated;
  });
}
