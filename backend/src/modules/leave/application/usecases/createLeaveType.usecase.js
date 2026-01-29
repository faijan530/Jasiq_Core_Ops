import crypto from 'node:crypto';

import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict } from '../../../../shared/kernel/errors.js';

import { readLeaveConfig, assertLeaveEnabled } from '../../domain/services/leavePolicy.service.js';
import { getLeaveTypeByCode, insertLeaveType } from '../../infrastructure/persistence/leaveType.repository.pg.js';

export async function createLeaveTypeUsecase(pool, { body, actorId, requestId }) {
  const cfg = await readLeaveConfig(pool);
  assertLeaveEnabled(cfg);

  const code = String(body.code || '').trim().toUpperCase();
  const name = String(body.name || '').trim();
  if (!code) throw badRequest('code is required');
  if (!name) throw badRequest('name is required');

  return withTransaction(pool, async (client) => {
    const existing = await getLeaveTypeByCode(client, { code });
    if (existing) throw conflict('Leave type code already exists');

    const inserted = await insertLeaveType(client, {
      id: crypto.randomUUID(),
      code,
      name,
      is_paid: !!body.isPaid,
      supports_half_day: body.supportsHalfDay !== false,
      affects_payroll: !!body.affectsPayroll,
      deduction_rule: body.deductionRule || null,
      is_active: body.isActive !== false,
      actor_id: actorId
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'LEAVE_TYPE',
      entityId: inserted.id,
      action: 'LEAVE_TYPE_CREATE',
      beforeData: null,
      afterData: {
        id: inserted.id,
        code: inserted.code,
        name: inserted.name,
        is_paid: inserted.is_paid,
        supports_half_day: inserted.supports_half_day,
        affects_payroll: inserted.affects_payroll,
        deduction_rule: inserted.deduction_rule,
        is_active: inserted.is_active
      },
      actorId,
      actorRole: null,
      reason: null
    });

    return inserted;
  });
}
