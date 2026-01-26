import crypto from 'node:crypto';

import { withTransaction } from '../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../shared/kernel/audit.js';
import { badRequest, conflict, notFound } from '../../../shared/kernel/errors.js';

import {
  assertEmployeeScope,
  assertNotExited,
  assertStatusTransition,
  toEmployeeCompensationDto,
  toEmployeeDocumentDto,
  toEmployeeDto,
  toEmployeeScopeHistoryDto
} from '../domain/employee.js';

import {
  closeActiveEmployeeCompensationVersion,
  closeActiveEmployeeScopeHistory,
  countEmployees,
  getActiveEmployeeCompensationVersion,
  getEmployeeByCode,
  getEmployeeById,
  getEmployeeByIdempotencyKey,
  getEmployeeDocumentById,
  insertEmployee,
  insertEmployeeCompensationVersion,
  insertEmployeeDocument,
  insertEmployeeScopeHistory,
  listEmployeeCompensationVersions,
  listEmployeeDocuments,
  listEmployees,
  listEmployeeScopeHistory,
  updateEmployeeProfile,
  updateEmployeeScope,
  updateEmployeeStatus
} from '../repository/employeeRepository.js';

function dayBeforeIso(date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function createEmployee(pool, { employeeCode, firstName, lastName, email, phone, status, scope, primaryDivisionId, actorId, requestId, reason, idempotencyKey }) {
  return withTransaction(pool, async (client) => {
    if (idempotencyKey) {
      const existingByKey = await getEmployeeByIdempotencyKey(client, idempotencyKey);
      if (existingByKey) return existingByKey;
    }

    const existing = await getEmployeeByCode(client, employeeCode);
    if (existing) throw conflict('Employee code already exists');

    assertEmployeeScope({ scope, primaryDivisionId });

    const now = new Date();
    const employee = {
      id: crypto.randomUUID(),
      employee_code: employeeCode,
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      status,
      scope,
      primary_division_id: primaryDivisionId || null,
      idempotency_key: idempotencyKey || null,
      created_at: now,
      created_by: actorId,
      updated_at: now,
      updated_by: actorId,
      version: 1
    };

    await insertEmployee(client, employee);

    await insertEmployeeScopeHistory(client, {
      id: crypto.randomUUID(),
      employee_id: employee.id,
      scope: employee.scope,
      primary_division_id: employee.primary_division_id,
      effective_from: now,
      effective_to: null,
      reason: 'Initial scope',
      changed_at: now,
      changed_by: actorId
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'EMPLOYEE',
      entityId: employee.id,
      action: 'CREATE',
      beforeData: null,
      afterData: {
        id: employee.id,
        employee_code: employee.employee_code,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        phone: employee.phone,
        status: employee.status,
        scope: employee.scope,
        primary_division_id: employee.primary_division_id
      },
      actorId,
      actorRole: null,
      reason: reason || null
    });

    return await getEmployeeById(client, employee.id);
  });
}

export async function updateEmployee(pool, { id, firstName, lastName, email, phone, actorId, requestId, reason }) {
  return withTransaction(pool, async (client) => {
    const before = await getEmployeeById(client, id);
    if (!before) throw notFound('Employee not found');

    const after = await updateEmployeeProfile(client, {
      id,
      firstName: typeof firstName === 'string' && firstName !== '' ? firstName : null,
      lastName: typeof lastName === 'string' && lastName !== '' ? lastName : null,
      email: typeof email === 'string' ? (email === '' ? null : email) : null,
      phone: typeof phone === 'string' ? (phone === '' ? null : phone) : null,
      actorId
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'EMPLOYEE',
      entityId: id,
      action: 'UPDATE',
      beforeData: {
        id: before.id,
        first_name: before.first_name,
        last_name: before.last_name,
        email: before.email,
        phone: before.phone
      },
      afterData: {
        id: after.id,
        first_name: after.first_name,
        last_name: after.last_name,
        email: after.email,
        phone: after.phone
      },
      actorId,
      actorRole: null,
      reason: reason || null
    });

    return after;
  });
}

export async function changeEmployeeScope(pool, { id, scope, primaryDivisionId, actorId, requestId, reason }) {
  return withTransaction(pool, async (client) => {
    const trimmedReason = String(reason || '').trim();
    if (!trimmedReason) throw badRequest('Reason is required');

    const before = await getEmployeeById(client, id);
    if (!before) throw notFound('Employee not found');

    assertNotExited(before);
    assertEmployeeScope({ scope, primaryDivisionId });

    const sameScope = before.scope === scope;
    const sameDiv = String(before.primary_division_id || '') === String(primaryDivisionId || '');
    if (sameScope && sameDiv) {
      return before;
    }

    const now = new Date();

    await closeActiveEmployeeScopeHistory(client, { employeeId: id, effectiveTo: now });

    await insertEmployeeScopeHistory(client, {
      id: crypto.randomUUID(),
      employee_id: id,
      scope,
      primary_division_id: primaryDivisionId || null,
      effective_from: now,
      effective_to: null,
      reason: trimmedReason,
      changed_at: now,
      changed_by: actorId
    });

    const after = await updateEmployeeScope(client, { id, scope, primaryDivisionId, actorId });

    await writeAuditLog(client, {
      requestId,
      entityType: 'EMPLOYEE_SCOPE',
      entityId: id,
      action: 'CHANGE_SCOPE',
      beforeData: { id: before.id, scope: before.scope, primary_division_id: before.primary_division_id },
      afterData: { id: after.id, scope: after.scope, primary_division_id: after.primary_division_id },
      actorId,
      actorRole: null,
      reason: trimmedReason
    });

    return after;
  });
}

export async function changeEmployeeStatus(pool, { id, status, actorId, requestId, reason }) {
  return withTransaction(pool, async (client) => {
    const before = await getEmployeeById(client, id);
    if (!before) throw notFound('Employee not found');

    assertStatusTransition(before.status, status);

    if (before.status === status) {
      return before;
    }

    const after = await updateEmployeeStatus(client, { id, status, actorId });

    await writeAuditLog(client, {
      requestId,
      entityType: 'EMPLOYEE',
      entityId: id,
      action: 'CHANGE_STATUS',
      beforeData: { id: before.id, status: before.status },
      afterData: { id: after.id, status: after.status },
      actorId,
      actorRole: null,
      reason: reason || null
    });

    return after;
  });
}

export async function addCompensationVersion(pool, { employeeId, amount, currency, frequency, effectiveFrom, reason, actorId, requestId }) {
  return withTransaction(pool, async (client) => {
    const trimmedReason = String(reason || '').trim();
    if (!trimmedReason) throw badRequest('Reason is required');

    const employee = await getEmployeeById(client, employeeId);
    if (!employee) throw notFound('Employee not found');

    assertNotExited(employee);

    const active = await getActiveEmployeeCompensationVersion(client, employeeId);
    const effFromDate = new Date(effectiveFrom);
    if (Number.isNaN(effFromDate.getTime())) throw badRequest('Invalid effectiveFrom');

    if (active) {
      const activeFrom = new Date(active.effective_from);
      if (effFromDate.getTime() <= activeFrom.getTime()) {
        throw conflict('Compensation effectiveFrom overlaps existing version');
      }

      await closeActiveEmployeeCompensationVersion(client, {
        employeeId,
        effectiveTo: dayBeforeIso(effFromDate)
      });
    }

    const now = new Date();
    const row = {
      id: crypto.randomUUID(),
      employee_id: employeeId,
      amount,
      currency,
      frequency,
      effective_from: effFromDate.toISOString().slice(0, 10),
      effective_to: null,
      reason: trimmedReason,
      created_at: now,
      created_by: actorId
    };

    await insertEmployeeCompensationVersion(client, row);

    await writeAuditLog(client, {
      requestId,
      entityType: 'EMPLOYEE_COMPENSATION',
      entityId: employeeId,
      action: 'ADD',
      beforeData: active
        ? {
          id: active.id,
          amount: active.amount,
          currency: active.currency,
          frequency: active.frequency,
          effective_from: active.effective_from,
          effective_to: active.effective_to
        }
        : null,
      afterData: {
        id: row.id,
        amount: row.amount,
        currency: row.currency,
        frequency: row.frequency,
        effective_from: row.effective_from,
        effective_to: row.effective_to
      },
      actorId,
      actorRole: null,
      reason: trimmedReason
    });

    return await listEmployeeCompensationVersions(client, employeeId);
  });
}

export async function uploadEmployeeDocument(pool, { employeeId, documentType, fileName, storageKey, mimeType, sizeBytes, actorId, requestId, reason }) {
  return withTransaction(pool, async (client) => {
    const employee = await getEmployeeById(client, employeeId);
    if (!employee) throw notFound('Employee not found');

    assertNotExited(employee);

    const now = new Date();
    const row = {
      id: crypto.randomUUID(),
      employee_id: employeeId,
      document_type: documentType,
      file_name: fileName,
      storage_key: storageKey,
      mime_type: mimeType || null,
      size_bytes: typeof sizeBytes === 'number' ? sizeBytes : null,
      is_active: true,
      uploaded_at: now,
      uploaded_by: actorId,
      deactivated_at: null,
      deactivated_by: null,
      deactivated_reason: null
    };

    await insertEmployeeDocument(client, row);

    await writeAuditLog(client, {
      requestId,
      entityType: 'EMPLOYEE_DOCUMENT',
      entityId: row.id,
      action: 'UPLOAD',
      beforeData: null,
      afterData: {
        id: row.id,
        employee_id: row.employee_id,
        document_type: row.document_type,
        file_name: row.file_name,
        storage_key: row.storage_key,
        is_active: row.is_active
      },
      actorId,
      actorRole: null,
      reason: reason || null
    });

    return await listEmployeeDocuments(client, employeeId);
  });
}

export async function getEmployeeWithScopeHistory(pool, { id }) {
  const employee = await getEmployeeById(pool, id);
  if (!employee) return null;

  const history = await listEmployeeScopeHistory(pool, id);
  return {
    employee,
    scopeHistory: history
  };
}

export async function listEmployeesPaged(pool, { divisionId, scope, status, offset, limit }) {
  const { rows, total } = await withTransaction(pool, async (client) => {
    const total = await countEmployees(client, { divisionId, scope, status });
    const rows = await listEmployees(client, { divisionId, scope, status, offset, limit });
    return { rows, total };
  });

  return { rows, total };
}

export async function listEmployeeCompensation(pool, { employeeId }) {
  const rows = await listEmployeeCompensationVersions(pool, employeeId);
  return rows;
}

export async function listEmployeeDocumentsService(pool, { employeeId }) {
  const rows = await listEmployeeDocuments(pool, employeeId);
  return rows;
}

export async function getEmployeeDocumentForDownload(pool, { employeeId, docId }) {
  const row = await getEmployeeDocumentById(pool, { employeeId, docId });
  return row;
}

export function toEmployeeDetailDto({ employee, scopeHistory }) {
  return {
    item: toEmployeeDto(employee),
    scopeHistory: (scopeHistory || []).map(toEmployeeScopeHistoryDto)
  };
}

export function toCompensationListDto(rows) {
  return { items: (rows || []).map(toEmployeeCompensationDto) };
}

export function toDocumentListDto(rows) {
  return { items: (rows || []).map(toEmployeeDocumentDto) };
}
