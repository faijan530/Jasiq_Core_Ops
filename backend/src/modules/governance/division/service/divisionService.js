import crypto from 'node:crypto';
import { badRequest, conflict, notFound } from '../../../../shared/kernel/errors.js';
import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';

import {
  countDivisions,
  getDivisionByCode,
  getDivisionById,
  insertDivision,
  updateDivisionIsActive
} from '../repository/divisionRepository.js';

export async function listDivisionsPaged(pool, { offset, limit }) {
  const items = await pool.query(
    'SELECT * FROM division ORDER BY code ASC OFFSET $1 LIMIT $2',
    [offset, limit]
  );
  const total = await countDivisions(pool);
  return { rows: items.rows, total };
}

export async function createDivision(pool, { code, name, actorId, requestId, reason }) {
  return withTransaction(pool, async (client) => {
    const existing = await getDivisionByCode(client, code);
    if (existing) throw conflict('Division code already exists');

    const now = new Date();
    const division = {
      id: crypto.randomUUID(),
      code,
      name,
      is_active: true,
      created_at: now,
      created_by: actorId,
      updated_at: now,
      updated_by: actorId,
      version: 1
    };

    await insertDivision(client, division);

    await writeAuditLog(client, {
      requestId,
      entityType: 'division',
      entityId: division.id,
      action: 'CREATE',
      beforeData: null,
      afterData: { id: division.id, code: division.code, name: division.name, is_active: division.is_active },
      actorId,
      actorRole: null,
      reason
    });

    const created = await getDivisionById(client, division.id);
    return created;
  });
}

export async function setDivisionActive(pool, { id, isActive, actorId, requestId, reason }) {
  return withTransaction(pool, async (client) => {
    const trimmedReason = String(reason || '').trim();
    if (!trimmedReason) throw badRequest('Reason is required');

    const before = await getDivisionById(client, id);
    if (!before) throw notFound('Division not found');

    if (before.is_active === isActive) {
      return before;
    }

    const after = await updateDivisionIsActive(client, { id, isActive, actorId });

    const action = isActive ? 'ACTIVATE' : 'DEACTIVATE';

    await writeAuditLog(client, {
      requestId,
      entityType: 'DIVISION',
      entityId: id,
      action,
      beforeData: { id: before.id, is_active: before.is_active },
      afterData: { id: after.id, is_active: after.is_active },
      actorId,
      actorRole: null,
      reason: trimmedReason
    });

    return after;
  });
}

export async function getDivision(pool, id) {
  const res = await pool.query('SELECT * FROM division WHERE id = $1', [id]);
  return res.rows[0] || null;
}
