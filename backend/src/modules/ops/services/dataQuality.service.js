import crypto from 'node:crypto';

import { withTransaction } from '../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../shared/kernel/audit.js';
import { conflict, notFound } from '../../../shared/kernel/errors.js';
import { parsePagination, pagedResponse } from '../../../shared/kernel/pagination.js';

import {
  insertFinding,
  findOpenFinding,
  listFindings,
  countFindings,
  getFindingById,
  updateFinding
} from '../repositories/dataQuality.repository.js';

import { readOpsConfig, assertDataQualityEnabled } from './opsPolicy.service.js';
import { assertCanAccessDivision } from './divisionScopePolicy.service.js';

function severityFor(type) {
  const t = String(type || '').toUpperCase();
  if (t.includes('MISSING_DIVISION')) return 'CRITICAL';
  return 'HIGH';
}

async function runRules(client, { divisionId, actorId }) {
  const findings = [];

  // Rule 1: Employee division scope mismatch
  const empRes = await client.query(
    `SELECT id, employee_code, scope, primary_division_id
     FROM employee
     WHERE status = 'ACTIVE'
       AND (
         (scope = 'DIVISION' AND primary_division_id IS NULL)
         OR (scope = 'COMPANY' AND primary_division_id IS NOT NULL)
       )
       AND ($1::uuid IS NULL OR primary_division_id = $1::uuid)`,
    [divisionId || null]
  );

  for (const e of empRes.rows || []) {
    findings.push({
      findingType: 'EMPLOYEE_SCOPE_MISMATCH',
      title: `Employee scope mismatch: ${e.employee_code}`,
      details: `Employee ${e.employee_code} has scope=${e.scope} but primary_division_id=${e.primary_division_id || 'NULL'}`,
      divisionId: e.primary_division_id || null,
      entityType: 'EMPLOYEE',
      entityId: e.id
    });
  }

  // Rule 2: Approved expense missing approved_by
  const expRes = await client.query(
    `SELECT id, title, division_id
     FROM expense
     WHERE status = 'APPROVED'
       AND approved_by IS NULL
       AND ($1::uuid IS NULL OR division_id = $1::uuid)`,
    [divisionId || null]
  );

  for (const ex of expRes.rows || []) {
    findings.push({
      findingType: 'EXPENSE_APPROVED_MISSING_ACTOR',
      title: `Expense approved without actor: ${ex.title}`,
      details: 'Expense status is APPROVED but approved_by is NULL',
      divisionId: ex.division_id || null,
      entityType: 'EXPENSE',
      entityId: ex.id
    });
  }

  // Rule 3: Approved income missing approved_by
  const incRes = await client.query(
    `SELECT id, title, division_id
     FROM income
     WHERE status = 'APPROVED'
       AND approved_by IS NULL
       AND ($1::uuid IS NULL OR division_id = $1::uuid)`,
    [divisionId || null]
  );

  for (const inc of incRes.rows || []) {
    findings.push({
      findingType: 'INCOME_APPROVED_MISSING_ACTOR',
      title: `Income approved without actor: ${inc.title}`,
      details: 'Income status is APPROVED but approved_by is NULL',
      divisionId: inc.division_id || null,
      entityType: 'INCOME',
      entityId: inc.id
    });
  }

  // Insert findings idempotently
  const created = [];
  for (const f of findings) {
    const existing = await findOpenFinding(client, {
      findingType: f.findingType,
      entityType: f.entityType,
      entityId: f.entityId
    });

    if (existing) continue;

    const row = await insertFinding(client, {
      id: crypto.randomUUID(),
      finding_type: f.findingType,
      severity: severityFor(f.findingType),
      title: f.title,
      details: f.details,
      division_id: f.divisionId,
      entity_type: f.entityType,
      entity_id: f.entityId,
      status: 'OPEN',
      created_at: new Date(),
      created_by: actorId
    });

    created.push(row);
  }

  return created;
}

export async function runDataQualityChecksService(pool, { actorId, actorRole, requestId, divisionId }) {
  const cfg = await readOpsConfig(pool);
  assertDataQualityEnabled(cfg);

  if (divisionId) await assertCanAccessDivision(pool, { actorId, divisionId });

  return withTransaction(pool, async (client) => {
    const created = await runRules(client, { divisionId: divisionId || null, actorId });

    await writeAuditLog(client, {
      requestId,
      entityType: 'DATA_QUALITY',
      entityId: null,
      action: 'DATA_QUALITY_RUN',
      beforeData: null,
      afterData: { divisionId: divisionId || null, createdCount: created.length },
      actorId,
      actorRole,
      reason: null
    });

    return { created };
  });
}

export async function listFindingsService(pool, { actorId, query }) {
  const cfg = await readOpsConfig(pool);
  assertDataQualityEnabled(cfg);

  const divisionId = query.divisionId || null;
  if (divisionId) await assertCanAccessDivision(pool, { actorId, divisionId });

  const { offset, limit, page, pageSize } = parsePagination(query);

  const rows = await listFindings(pool, {
    divisionId,
    status: query.status || null,
    findingType: query.findingType || null,
    offset,
    limit
  });

  const total = await countFindings(pool, {
    divisionId,
    status: query.status || null,
    findingType: query.findingType || null
  });

  return pagedResponse({ items: rows, total, page, pageSize });
}

export async function acknowledgeFindingService(pool, { id, actorId, actorRole, requestId }) {
  const cfg = await readOpsConfig(pool);
  assertDataQualityEnabled(cfg);

  return withTransaction(pool, async (client) => {
    const current = await getFindingById(client, { id, forUpdate: true });
    if (!current) throw notFound('Finding not found');

    if (current.status === 'ACKNOWLEDGED' || current.status === 'RESOLVED') return current;
    if (current.status !== 'OPEN') throw conflict('Invalid finding state');

    const updated = await updateFinding(client, { id, patch: { status: 'ACKNOWLEDGED' } });

    await writeAuditLog(client, {
      requestId,
      entityType: 'DATA_QUALITY_FINDING',
      entityId: id,
      action: 'DATA_QUALITY_ACK',
      beforeData: { status: current.status },
      afterData: { status: updated.status },
      actorId,
      actorRole,
      reason: null
    });

    return updated;
  });
}

export async function resolveFindingService(pool, { id, actorId, actorRole, requestId }) {
  const cfg = await readOpsConfig(pool);
  assertDataQualityEnabled(cfg);

  return withTransaction(pool, async (client) => {
    const current = await getFindingById(client, { id, forUpdate: true });
    if (!current) throw notFound('Finding not found');

    if (current.status === 'RESOLVED') return current;
    if (current.status !== 'OPEN' && current.status !== 'ACKNOWLEDGED') throw conflict('Invalid finding state');

    const updated = await updateFinding(client, {
      id,
      patch: {
        status: 'RESOLVED',
        resolved_at: new Date(),
        resolved_by: actorId
      }
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'DATA_QUALITY_FINDING',
      entityId: id,
      action: 'DATA_QUALITY_RESOLVE',
      beforeData: { status: current.status },
      afterData: { status: updated.status },
      actorId,
      actorRole,
      reason: null
    });

    return updated;
  });
}
