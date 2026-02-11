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

async function getActiveEmployeeCountsByDivision(pool, divisionIds) {
  if (!divisionIds || divisionIds.length === 0) return new Map();
  const res = await pool.query(
    `SELECT primary_division_id AS division_id, COUNT(*)::int AS c
     FROM employee
     WHERE status = 'ACTIVE'
       AND primary_division_id = ANY($1::uuid[])
     GROUP BY primary_division_id`,
    [divisionIds]
  );
  const m = new Map();
  for (const row of res.rows) {
    m.set(String(row.division_id), Number(row.c));
  }
  return m;
}

function computeDivisionBlockedReasons({ isActive, activeEmployeeCount }) {
  const reasons = [];
  if (!isActive) return reasons;
  if (Number(activeEmployeeCount || 0) > 0) {
    reasons.push('Active employees exist');
  }
  return reasons;
}

export async function listDivisionsPaged(pool, { offset, limit }) {
  const items = await pool.query(
    'SELECT * FROM division ORDER BY code ASC OFFSET $1 LIMIT $2',
    [offset, limit]
  );
  const ids = items.rows.map((r) => r.id);
  const counts = await getActiveEmployeeCountsByDivision(pool, ids);
  const enrichedRows = items.rows.map((r) => {
    const activeEmployeeCount = counts.get(String(r.id)) || 0;
    return {
      ...r,
      blockedReasons: computeDivisionBlockedReasons({ isActive: r.is_active, activeEmployeeCount })
    };
  });
  const total = await countDivisions(pool);
  return { rows: enrichedRows, total };
}

export async function createDivision(pool, { code, name, type, description, actorId, requestId, reason }) {
  return withTransaction(pool, async (client) => {
    const existing = await getDivisionByCode(client, code);
    if (existing) throw conflict('Division code already exists');

    const now = new Date();
    const division = {
      id: crypto.randomUUID(),
      code,
      name,
      type: type || 'INTERNAL',
      description: description || null,
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

    if (before.is_active && !isActive) {
      const check = await client.query(
        `SELECT COUNT(*)::int AS c
         FROM employee
         WHERE status = 'ACTIVE' AND primary_division_id = $1`,
        [id]
      );
      const activeEmployeeCount = Number(check.rows[0]?.c || 0);
      if (activeEmployeeCount > 0) {
        throw badRequest('Cannot deactivate division: Active employees exist');
      }
    }

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
  const row = res.rows[0] || null;
  if (!row) return null;

  const counts = await getActiveEmployeeCountsByDivision(pool, [row.id]);
  const activeEmployeeCount = counts.get(String(row.id)) || 0;
  return {
    ...row,
    blockedReasons: computeDivisionBlockedReasons({ isActive: row.is_active, activeEmployeeCount })
  };
}
