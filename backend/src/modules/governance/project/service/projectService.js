import crypto from 'node:crypto';

import { badRequest, conflict, notFound } from '../../../../shared/kernel/errors.js';
import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';

import {
  countProjects,
  getProjectByDivisionAndCode,
  getProjectById,
  insertProject,
  updateProject
} from '../repository/projectRepository.js';

export async function listProjectsPaged(pool, { divisionId, offset, limit }) {
  const rows = await pool.query(
    `SELECT *
     FROM project
     WHERE ($1::uuid IS NULL OR division_id = $1)
     ORDER BY division_id ASC, code ASC
     OFFSET $2 LIMIT $3`,
    [divisionId || null, offset, limit]
  );
  const total = await countProjects(pool, { divisionId });
  return { rows: rows.rows, total };
}

export async function getProject(pool, id) {
  const res = await pool.query('SELECT * FROM project WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function createProject(pool, { divisionId, code, name, actorId, requestId, reason }) {
  return withTransaction(pool, async (client) => {
    const existing = await getProjectByDivisionAndCode(client, { divisionId, code });
    if (existing) throw conflict('Project code already exists in division');

    const now = new Date();
    const project = {
      id: crypto.randomUUID(),
      division_id: divisionId,
      code,
      name,
      is_active: true,
      created_at: now,
      created_by: actorId,
      updated_at: now,
      updated_by: actorId,
      version: 1
    };

    await insertProject(client, project);

    await writeAuditLog(client, {
      requestId,
      entityType: 'PROJECT',
      entityId: project.id,
      action: 'CREATE',
      beforeData: null,
      afterData: { id: project.id, division_id: project.division_id, code: project.code, name: project.name, is_active: project.is_active },
      actorId,
      actorRole: null,
      reason
    });

    return await getProjectById(client, project.id);
  });
}

export async function updateProjectFields(pool, { id, name, isActive, actorId, requestId, reason }) {
  return withTransaction(pool, async (client) => {
    const before = await getProjectById(client, id);
    if (!before) throw notFound('Project not found');

    const nameChange = typeof name === 'string' && name !== '' ? name : null;
    const hasNameChange = nameChange !== null && nameChange !== before.name;
    const hasActiveChange = typeof isActive === 'boolean' && isActive !== before.is_active;

    const trimmedReason = String(reason || '').trim();
    if (hasActiveChange && !trimmedReason) throw badRequest('Reason is required');

    if (!hasNameChange && !hasActiveChange) {
      return before;
    }

    const after = await updateProject(client, { id, name, isActive, actorId });

    const entityType = 'PROJECT';
    const action = hasActiveChange ? (isActive ? 'ACTIVATE' : 'DEACTIVATE') : 'UPDATE';

    await writeAuditLog(client, {
      requestId,
      entityType,
      entityId: id,
      action,
      beforeData: { id: before.id, name: before.name, is_active: before.is_active },
      afterData: { id: after.id, name: after.name, is_active: after.is_active },
      actorId,
      actorRole: null,
      reason: trimmedReason || null
    });

    return after;
  });
}
