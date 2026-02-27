import crypto from 'node:crypto';

import { withTransaction } from '../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../shared/kernel/audit.js';
import { badRequest, conflict, notFound } from '../../../shared/kernel/errors.js';
import { parsePagination, pagedResponse } from '../../../shared/kernel/pagination.js';

import {
  insertOverrideRequest,
  listOverrides,
  countOverrides,
  getOverrideById,
  updateOverride
} from '../repositories/override.repository.js';

import { getExecutor } from './moduleActionExecutors.js';
import { readOpsConfig, assertOverrideEnabled } from './opsPolicy.service.js';
import { assertCanAccessDivision } from './divisionScopePolicy.service.js';

function normalizeType(v) {
  return String(v || '').trim().toUpperCase();
}

export async function createOverrideService(pool, { body, actorId, actorRole, requestId }) {
  const cfg = await readOpsConfig(pool);
  assertOverrideEnabled(cfg);

  const divisionId = body.divisionId || null;
  if (divisionId) await assertCanAccessDivision(pool, { actorId, divisionId });

  const reason = String(body.reason || '').trim();
  if (!reason) throw badRequest('Reason is required');

  return withTransaction(pool, async (client) => {
    const row = await insertOverrideRequest(client, {
      id: crypto.randomUUID(),
      override_type: normalizeType(body.overrideType),
      division_id: divisionId,
      target_entity_type: normalizeType(body.targetEntityType),
      target_entity_id: body.targetEntityId,
      requested_action: normalizeType(body.requestedAction),
      reason,
      status: 'REQUESTED',
      requested_by: actorId,
      requested_at: new Date()
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'OVERRIDE_REQUEST',
      entityId: row.id,
      action: 'OVERRIDE_REQUEST_CREATE',
      beforeData: null,
      afterData: { status: row.status, overrideType: row.override_type },
      actorId,
      actorRole,
      reason
    });

    return row;
  });
}

export async function listOverridesService(pool, { actorId, query }) {
  const cfg = await readOpsConfig(pool);
  assertOverrideEnabled(cfg);

  const divisionId = query.divisionId || null;
  if (divisionId) await assertCanAccessDivision(pool, { actorId, divisionId });

  const { offset, limit, page, pageSize } = parsePagination(query);

  const rows = await listOverrides(pool, {
    divisionId,
    status: query.status || null,
    overrideType: query.overrideType ? normalizeType(query.overrideType) : null,
    offset,
    limit
  });

  const total = await countOverrides(pool, {
    divisionId,
    status: query.status || null,
    overrideType: query.overrideType ? normalizeType(query.overrideType) : null
  });

  return pagedResponse({ items: rows, total, page, pageSize });
}

export async function approveOverrideService(pool, { id, approvalReason, actorId, actorRole, requestId }) {
  const cfg = await readOpsConfig(pool);
  assertOverrideEnabled(cfg);

  const reason = String(approvalReason || '').trim();
  if (!reason) throw badRequest('Approval reason is required');

  return withTransaction(pool, async (client) => {
    const current = await getOverrideById(client, { id, forUpdate: true });
    if (!current) throw notFound('Override request not found');

    if (current.status === 'APPROVED') return current;
    if (current.status !== 'REQUESTED') throw conflict('Override request is not in REQUESTED status');

    const updated = await updateOverride(client, {
      id,
      patch: {
        status: 'APPROVED',
        approved_by: actorId,
        approved_at: new Date(),
        approval_reason: reason
      }
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'OVERRIDE_REQUEST',
      entityId: id,
      action: 'OVERRIDE_REQUEST_APPROVE',
      beforeData: { status: current.status },
      afterData: { status: updated.status },
      actorId,
      actorRole,
      reason
    });

    return updated;
  });
}

export async function rejectOverrideService(pool, { id, approvalReason, actorId, actorRole, requestId }) {
  const cfg = await readOpsConfig(pool);
  assertOverrideEnabled(cfg);

  const reason = String(approvalReason || '').trim();
  if (!reason) throw badRequest('Approval reason is required');

  return withTransaction(pool, async (client) => {
    const current = await getOverrideById(client, { id, forUpdate: true });
    if (!current) throw notFound('Override request not found');

    if (current.status === 'REJECTED') return current;
    if (current.status !== 'REQUESTED') throw conflict('Override request is not in REQUESTED status');

    const updated = await updateOverride(client, {
      id,
      patch: {
        status: 'REJECTED',
        approved_by: actorId,
        approved_at: new Date(),
        approval_reason: reason
      }
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'OVERRIDE_REQUEST',
      entityId: id,
      action: 'OVERRIDE_REQUEST_REJECT',
      beforeData: { status: current.status },
      afterData: { status: updated.status },
      actorId,
      actorRole,
      reason
    });

    return updated;
  });
}

export async function executeOverrideService(pool, { id, actorId, actorRole, requestId, reason }) {
  const cfg = await readOpsConfig(pool);
  assertOverrideEnabled(cfg);

  return withTransaction(pool, async (client) => {
    const current = await getOverrideById(client, { id, forUpdate: true });
    if (!current) throw notFound('Override request not found');

    if (current.status === 'EXECUTED') return current;
    if (current.status !== 'APPROVED') throw conflict('Override request must be APPROVED before execution');

    const exec = getExecutor(current.override_type);
    if (!exec) {
      throw badRequest(`No executor registered for override_type: ${current.override_type}`);
    }

    const executionResult = await exec({
      client,
      override: current,
      actorId,
      requestId,
      reason: String(reason || '').trim() || null
    });

    const updated = await updateOverride(client, {
      id,
      patch: {
        status: 'EXECUTED',
        executed_by: actorId,
        executed_at: new Date(),
        execution_result: executionResult ?? null
      }
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'OVERRIDE_REQUEST',
      entityId: id,
      action: 'OVERRIDE_REQUEST_EXECUTE',
      beforeData: { status: current.status },
      afterData: { status: updated.status, execution_result: updated.execution_result },
      actorId,
      actorRole,
      reason: String(reason || '').trim() || null
    });

    return updated;
  });
}
