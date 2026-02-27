import crypto from 'node:crypto';

import { withTransaction } from '../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../shared/kernel/audit.js';
import { badRequest, conflict, forbidden, notFound } from '../../../shared/kernel/errors.js';
import { pagedResponse } from '../../../shared/kernel/pagination.js';

import { reimbursementDto } from '../dtos/reimbursement.dto.js';
import { reimbursementReceiptDto } from '../dtos/reimbursementReceipt.dto.js';
import { reimbursementPaymentDto } from '../dtos/reimbursementPayment.dto.js';

import {
  getEmployeeIdByUserId,
  getEmployeeById,
  resolveEmployeeScopeForDate,
  insertReimbursement,
  getReimbursementById,
  updateReimbursementDraft,
  updateReimbursementStatus,
  updateReimbursementPaymentTotals,
  listReimbursements,
  countReimbursements,
  countActiveReceipts
} from '../repositories/reimbursement.repository.js';

import {
  insertReimbursementReceipt,
  listReimbursementReceipts,
  getReimbursementReceipt
} from '../repositories/reimbursementReceipt.repository.js';

import {
  insertReimbursementPayment,
  sumReimbursementPayments,
  listReimbursementPayments,
  countReimbursementPayments
} from '../repositories/reimbursementPayment.repository.js';

import {
  readReimbursementConfig,
  assertReimbursementEnabled,
  assertAmount,
  assertTransition,
  assertClaimDate,
  assertMaxAmount,
  assertMonthOpenForClaimDate,
  monthStartIso
} from './reimbursementPolicy.service.js';

import { REIMBURSEMENT_STATUS } from './reimbursementStatus.vo.js';

import { assertHasPermission, assertCanAccessDivision } from './reimbursementAuthorization.service.js';

import { storeReimbursementReceipt, readReimbursementReceiptFromStorage } from './reimbursementReceiptStorage.adapter.js';

import { createApprovedExpenseFromReimbursement } from './reimbursementExpenseWriter.adapter.js';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeStatus(s) {
  return String(s || '').toUpperCase();
}

function assertActiveEmployee(emp) {
  if (!emp) throw badRequest('Employee not found');
  if (String(emp.status).toUpperCase() !== 'ACTIVE') throw forbidden('Only active employees can create claims');
}

function assertOwns(actorEmployeeId, reimbursement) {
  if (String(reimbursement.employee_id) !== String(actorEmployeeId)) throw forbidden();
}

export async function createDraftService(pool, { body, actorId, requestId }) {
  const cfg = await readReimbursementConfig(pool);
  assertReimbursementEnabled(cfg);

  const claimDate = assertClaimDate(cfg, { claimDate: body.claimDate, todayDate: todayIso() });
  const totalAmount = assertAmount(body.totalAmount);
  assertMaxAmount(cfg, { totalAmount });

  return withTransaction(pool, async (client) => {
    const employeeId = await getEmployeeIdByUserId(client, { userId: actorId });
    if (!employeeId) throw badRequest('Employee not found for user');

    const emp = await getEmployeeById(client, { employeeId });
    assertActiveEmployee(emp);

    await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_CREATE_SELF', divisionId: null });

    await assertMonthOpenForClaimDate(client, {
      claimDate,
      actorId,
      overrideReason: body.monthCloseOverrideReason
    });

    const scopeInfo = await resolveEmployeeScopeForDate(client, { employeeId, claimDate });
    const scope = String(scopeInfo.scope || '').toUpperCase();

    if (!scope || (scope !== 'COMPANY' && scope !== 'DIVISION')) throw badRequest('Unable to resolve employee scope for claim date');

    const divisionId = scope === 'DIVISION' ? scopeInfo.divisionId : null;
    if (scope === 'DIVISION' && !divisionId) throw badRequest('Division scope requires divisionId');

    const row = await insertReimbursement(client, {
      id: crypto.randomUUID(),
      employee_id: employeeId,
      claim_date: claimDate,
      claim_month: monthStartIso(claimDate),
      title: String(body.title || '').trim(),
      description: body.description ? String(body.description).trim() : null,
      total_amount: totalAmount,
      scope,
      division_id: divisionId,
      status: REIMBURSEMENT_STATUS.DRAFT,
      decision_reason: null,
      approved_at: null,
      approved_by: null,
      rejected_at: null,
      rejected_by: null,
      paid_amount: 0,
      due_amount: totalAmount,
      linked_expense_id: null,
      submitted_at: null,
      submitted_by: null,
      actor_id: actorId,
      version: 1
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'REIMBURSEMENT',
      entityId: row.id,
      action: 'REIMBURSEMENT_DRAFT_CREATED',
      beforeData: null,
      afterData: { status: row.status, totalAmount: row.total_amount, scope: row.scope, divisionId: row.division_id },
      actorId,
      actorRole: null,
      reason: null
    });

    return reimbursementDto(row);
  });
}

export async function updateDraftService(pool, { id, body, actorId, requestId }) {
  const cfg = await readReimbursementConfig(pool);
  assertReimbursementEnabled(cfg);

  const expectedVersion = Number(body.version);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw badRequest('version is required');

  return withTransaction(pool, async (client) => {
    const employeeId = await getEmployeeIdByUserId(client, { userId: actorId });
    if (!employeeId) throw badRequest('Employee not found for user');

    const current = await getReimbursementById(client, { id, forUpdate: true });
    if (!current) throw notFound('Reimbursement not found');

    assertOwns(employeeId, current);

    await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_EDIT_SELF_DRAFT', divisionId: null });

    if (normalizeStatus(current.status) !== REIMBURSEMENT_STATUS.DRAFT) throw badRequest('Only DRAFT reimbursements can be updated');

    await assertMonthOpenForClaimDate(client, {
      claimDate: String(current.claim_date).slice(0, 10),
      actorId,
      overrideReason: body.monthCloseOverrideReason
    });

    const patch = {};
    if (body.title !== undefined) patch.title = String(body.title || '').trim();
    if (body.description !== undefined) patch.description = body.description ? String(body.description).trim() : null;

    if (body.totalAmount !== undefined) {
      const totalAmount = assertAmount(body.totalAmount);
      assertMaxAmount(cfg, { totalAmount });
      patch.total_amount = totalAmount;
      patch.due_amount = Math.max(0, totalAmount - Number(current.paid_amount || 0));
    }

    const updated = await updateReimbursementDraft(client, { id, patch, actorId, expectedVersion });
    if (!updated) throw conflict('Reimbursement was updated by another user');

    await writeAuditLog(client, {
      requestId,
      entityType: 'REIMBURSEMENT',
      entityId: updated.id,
      action: 'REIMBURSEMENT_DRAFT_UPDATED',
      beforeData: { status: current.status, totalAmount: current.total_amount, version: current.version },
      afterData: { status: updated.status, totalAmount: updated.total_amount, version: updated.version },
      actorId,
      actorRole: null,
      reason: null
    });

    return reimbursementDto(updated);
  });
}

export async function uploadReceiptService(pool, { id, body, actorId, requestId }) {
  const cfg = await readReimbursementConfig(pool);
  assertReimbursementEnabled(cfg);

  const fileName = String(body.fileName || '').trim();
  const contentType = String(body.contentType || '').trim();
  const fileBase64 = String(body.fileBase64 || '').trim();

  if (!fileName) throw badRequest('fileName is required');
  if (!contentType) throw badRequest('contentType is required');
  if (!fileBase64) throw badRequest('fileBase64 is required');

  return withTransaction(pool, async (client) => {
    const employeeId = await getEmployeeIdByUserId(client, { userId: actorId });
    if (!employeeId) throw badRequest('Employee not found for user');

    const current = await getReimbursementById(client, { id, forUpdate: true });
    if (!current) throw notFound('Reimbursement not found');

    assertOwns(employeeId, current);

    if (normalizeStatus(current.status) !== REIMBURSEMENT_STATUS.DRAFT) throw badRequest('Receipts can only be uploaded in DRAFT');

    await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_EDIT_SELF_DRAFT', divisionId: null });

    await assertMonthOpenForClaimDate(client, {
      claimDate: String(current.claim_date).slice(0, 10),
      actorId,
      overrideReason: body.monthCloseOverrideReason
    });

    const stored = await storeReimbursementReceipt({ reimbursementId: current.id, fileName, contentType, fileBase64 });

    const inserted = await insertReimbursementReceipt(client, {
      id: crypto.randomUUID(),
      reimbursement_id: current.id,
      file_name: fileName,
      content_type: contentType,
      file_size: stored.fileSize,
      storage_key: stored.relPath,
      uploaded_by: actorId
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'REIMBURSEMENT_RECEIPT',
      entityId: inserted.id,
      action: 'REIMBURSEMENT_RECEIPT_UPLOADED',
      beforeData: null,
      afterData: {
        reimbursementId: inserted.reimbursement_id,
        fileName: inserted.file_name,
        contentType: inserted.content_type,
        fileSize: inserted.file_size
      },
      actorId,
      actorRole: null,
      reason: null
    });

    return reimbursementReceiptDto(inserted);
  });
}

export async function submitService(pool, { id, body, actorId, requestId }) {
  const cfg = await readReimbursementConfig(pool);
  assertReimbursementEnabled(cfg);

  const expectedVersion = Number(body.version);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw badRequest('version is required');

  return withTransaction(pool, async (client) => {
    const employeeId = await getEmployeeIdByUserId(client, { userId: actorId });
    if (!employeeId) throw badRequest('Employee not found for user');

    const current = await getReimbursementById(client, { id, forUpdate: true });
    if (!current) throw notFound('Reimbursement not found');

    assertOwns(employeeId, current);

    await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_SUBMIT_SELF', divisionId: null });

    const from = normalizeStatus(current.status);
    assertTransition({ fromStatus: from, toStatus: REIMBURSEMENT_STATUS.SUBMITTED });

    await assertMonthOpenForClaimDate(client, {
      claimDate: String(current.claim_date).slice(0, 10),
      actorId,
      overrideReason: body.monthCloseOverrideReason
    });

    if (cfg.receiptRequired) {
      const c = await countActiveReceipts(client, { reimbursementId: current.id });
      if (c <= 0) throw badRequest('Receipt is required');
    }

    const updated = await updateReimbursementStatus(client, {
      id: current.id,
      toStatus: REIMBURSEMENT_STATUS.SUBMITTED,
      decisionReason: null,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      submittedAt: new Date(),
      submittedBy: actorId,
      paidAmount: null,
      dueAmount: null,
      linkedExpenseId: null,
      actorId,
      expectedVersion
    });

    if (!updated) throw conflict('Reimbursement was updated by another user');

    await writeAuditLog(client, {
      requestId,
      entityType: 'REIMBURSEMENT',
      entityId: updated.id,
      action: 'REIMBURSEMENT_SUBMITTED',
      beforeData: { status: current.status, version: current.version },
      afterData: { status: updated.status, version: updated.version },
      actorId,
      actorRole: null,
      reason: null
    });

    return reimbursementDto(updated);
  });
}

export async function approveService(pool, { id, body, actorId, requestId }) {
  const cfg = await readReimbursementConfig(pool);
  assertReimbursementEnabled(cfg);

  const expectedVersion = Number(body.version);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw badRequest('version is required');

  return withTransaction(pool, async (client) => {
    const current = await getReimbursementById(client, { id, forUpdate: true });
    if (!current) throw notFound('Reimbursement not found');

    if (current.division_id) {
      await assertCanAccessDivision(pool, { actorId, divisionId: current.division_id });
      await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_APPROVE', divisionId: current.division_id });
    } else {
      await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_APPROVE', divisionId: null });
    }

    const from = normalizeStatus(current.status);
    assertTransition({ fromStatus: from, toStatus: REIMBURSEMENT_STATUS.APPROVED });

    await assertMonthOpenForClaimDate(client, {
      claimDate: String(current.claim_date).slice(0, 10),
      actorId,
      overrideReason: body.monthCloseOverrideReason
    });

    let linkedExpenseId = current.linked_expense_id || null;

    if (!linkedExpenseId && cfg.autoExpenseOn) {
      const createdId = await createApprovedExpenseFromReimbursement(client, {
        reimbursement: current,
        actorId
      });
      linkedExpenseId = createdId;

      await writeAuditLog(client, {
        requestId,
        entityType: 'REIMBURSEMENT',
        entityId: current.id,
        action: 'REIMBURSEMENT_EXPENSE_LINKED',
        beforeData: { linkedExpenseId: null },
        afterData: { linkedExpenseId },
        actorId,
        actorRole: null,
        reason: null
      });
    }

    const updated = await updateReimbursementStatus(client, {
      id: current.id,
      toStatus: REIMBURSEMENT_STATUS.APPROVED,
      decisionReason: body.decisionReason ? String(body.decisionReason).trim() : null,
      approvedAt: new Date(),
      approvedBy: actorId,
      rejectedAt: null,
      rejectedBy: null,
      submittedAt: null,
      submittedBy: null,
      paidAmount: null,
      dueAmount: null,
      linkedExpenseId,
      actorId,
      expectedVersion
    });

    if (!updated) throw conflict('Reimbursement was updated by another user');

    await writeAuditLog(client, {
      requestId,
      entityType: 'REIMBURSEMENT',
      entityId: updated.id,
      action: 'REIMBURSEMENT_APPROVED',
      beforeData: { status: current.status, version: current.version },
      afterData: { status: updated.status, version: updated.version },
      actorId,
      actorRole: null,
      reason: body.decisionReason ? String(body.decisionReason).trim() : null
    });

    return reimbursementDto(updated);
  });
}

export async function rejectService(pool, { id, body, actorId, requestId }) {
  const cfg = await readReimbursementConfig(pool);
  assertReimbursementEnabled(cfg);

  const expectedVersion = Number(body.version);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw badRequest('version is required');

  const reason = String(body.decisionReason || '').trim();
  if (!reason) throw badRequest('decisionReason is required');

  return withTransaction(pool, async (client) => {
    const current = await getReimbursementById(client, { id, forUpdate: true });
    if (!current) throw notFound('Reimbursement not found');

    if (current.division_id) {
      await assertCanAccessDivision(pool, { actorId, divisionId: current.division_id });
      await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_REJECT', divisionId: current.division_id });
    } else {
      await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_REJECT', divisionId: null });
    }

    const from = normalizeStatus(current.status);
    assertTransition({ fromStatus: from, toStatus: REIMBURSEMENT_STATUS.REJECTED });

    await assertMonthOpenForClaimDate(client, {
      claimDate: String(current.claim_date).slice(0, 10),
      actorId,
      overrideReason: body.monthCloseOverrideReason
    });

    const updated = await updateReimbursementStatus(client, {
      id: current.id,
      toStatus: REIMBURSEMENT_STATUS.REJECTED,
      decisionReason: reason,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: new Date(),
      rejectedBy: actorId,
      submittedAt: null,
      submittedBy: null,
      paidAmount: null,
      dueAmount: null,
      linkedExpenseId: null,
      actorId,
      expectedVersion
    });

    if (!updated) throw conflict('Reimbursement was updated by another user');

    await writeAuditLog(client, {
      requestId,
      entityType: 'REIMBURSEMENT',
      entityId: updated.id,
      action: 'REIMBURSEMENT_REJECTED',
      beforeData: { status: current.status, version: current.version },
      afterData: { status: updated.status, version: updated.version },
      actorId,
      actorRole: null,
      reason
    });

    return reimbursementDto(updated);
  });
}

export async function addPaymentService(pool, { id, body, actorId, requestId }) {
  const cfg = await readReimbursementConfig(pool);
  assertReimbursementEnabled(cfg);

  if (!cfg.partialPaymentsEnabled) {
    // Allow only full settlement
    // still allow if amount equals due; enforced below.
  }

  const expectedVersion = Number(body.version);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw badRequest('version is required');

  const paidAmount = assertAmount(body.paidAmount);
  const paidAt = new Date(body.paidAt);
  if (Number.isNaN(paidAt.getTime())) throw badRequest('Invalid paidAt');

  return withTransaction(pool, async (client) => {
    const current = await getReimbursementById(client, { id, forUpdate: true });
    if (!current) throw notFound('Reimbursement not found');

    if (current.division_id) {
      await assertCanAccessDivision(pool, { actorId, divisionId: current.division_id });
      await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_ADD_PAYMENT', divisionId: current.division_id });
    } else {
      await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_ADD_PAYMENT', divisionId: null });
    }

    const status = normalizeStatus(current.status);
    if (status !== REIMBURSEMENT_STATUS.APPROVED && status !== REIMBURSEMENT_STATUS.PAID) {
      throw badRequest('Payments can only be added after approval');
    }

    await assertMonthOpenForClaimDate(client, {
      claimDate: String(current.claim_date).slice(0, 10),
      actorId,
      overrideReason: body.monthCloseOverrideReason
    });

    const currentPaid = Number(current.paid_amount || 0);
    const total = Number(current.total_amount || 0);
    const due = Math.max(0, total - currentPaid);

    if (!cfg.partialPaymentsEnabled && paidAmount !== due) throw badRequest('Partial payments are disabled');
    if (paidAmount > due) throw badRequest('Payment exceeds due amount');

    const paymentRow = await insertReimbursementPayment(client, {
      id: crypto.randomUUID(),
      reimbursement_id: current.id,
      paid_amount: paidAmount,
      paid_at: paidAt,
      method: String(body.method || '').toUpperCase(),
      reference_id: body.referenceId ? String(body.referenceId).trim() : null,
      note: body.note ? String(body.note).trim() : null,
      created_by: actorId
    });

    const newPaid = currentPaid + paidAmount;
    const newDue = Math.max(0, total - newPaid);
    const newStatus = newDue === 0 ? REIMBURSEMENT_STATUS.PAID : REIMBURSEMENT_STATUS.APPROVED;

    const updated = await updateReimbursementPaymentTotals(client, {
      id: current.id,
      paidAmount: newPaid,
      dueAmount: newDue,
      status: newStatus,
      actorId,
      expectedVersion
    });

    if (!updated) throw conflict('Reimbursement was updated by another user');

    await writeAuditLog(client, {
      requestId,
      entityType: 'REIMBURSEMENT_PAYMENT',
      entityId: paymentRow.id,
      action: 'REIMBURSEMENT_PAYMENT_ADDED',
      beforeData: { status: current.status, paidAmount: current.paid_amount, dueAmount: current.due_amount },
      afterData: { status: updated.status, paidAmount: updated.paid_amount, dueAmount: updated.due_amount },
      actorId,
      actorRole: null,
      reason: null
    });

    return {
      reimbursement: reimbursementDto(updated),
      payment: reimbursementPaymentDto(paymentRow)
    };
  });
}

export async function closeService(pool, { id, body, actorId, requestId }) {
  const cfg = await readReimbursementConfig(pool);
  assertReimbursementEnabled(cfg);

  const expectedVersion = Number(body.version);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw badRequest('version is required');

  return withTransaction(pool, async (client) => {
    const current = await getReimbursementById(client, { id, forUpdate: true });
    if (!current) throw notFound('Reimbursement not found');

    if (current.division_id) {
      await assertCanAccessDivision(pool, { actorId, divisionId: current.division_id });
      await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_CLOSE', divisionId: current.division_id });
    } else {
      await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_CLOSE', divisionId: null });
    }

    const from = normalizeStatus(current.status);
    assertTransition({ fromStatus: from, toStatus: REIMBURSEMENT_STATUS.CLOSED });

    if (Number(current.due_amount || 0) !== 0) throw badRequest('Cannot close reimbursement with due amount');

    await assertMonthOpenForClaimDate(client, {
      claimDate: String(current.claim_date).slice(0, 10),
      actorId,
      overrideReason: body.monthCloseOverrideReason
    });

    const updated = await updateReimbursementStatus(client, {
      id: current.id,
      toStatus: REIMBURSEMENT_STATUS.CLOSED,
      decisionReason: null,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      submittedAt: null,
      submittedBy: null,
      paidAmount: null,
      dueAmount: null,
      linkedExpenseId: null,
      actorId,
      expectedVersion
    });

    if (!updated) throw conflict('Reimbursement was updated by another user');

    await writeAuditLog(client, {
      requestId,
      entityType: 'REIMBURSEMENT',
      entityId: updated.id,
      action: 'REIMBURSEMENT_CLOSED',
      beforeData: { status: current.status, version: current.version },
      afterData: { status: updated.status, version: updated.version },
      actorId,
      actorRole: null,
      reason: null
    });

    return reimbursementDto(updated);
  });
}

export async function listMyReimbursementsService(pool, { actorId, query, offset, limit, page, pageSize }) {
  const cfg = await readReimbursementConfig(pool);
  assertReimbursementEnabled(cfg);

  await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_VIEW_SELF', divisionId: null });

  const employeeId = await getEmployeeIdByUserId(pool, { userId: actorId });

  const status = query.status ? String(query.status).toUpperCase() : null;
  const claimMonth = query.month ? String(query.month).slice(0, 10) : null;

  const total = await countReimbursements(pool, { employeeId, divisionId: null, status, claimMonth });
  const rows = await listReimbursements(pool, { employeeId, divisionId: null, status, claimMonth, offset, limit });

  return pagedResponse({ items: rows.map(reimbursementDto), total, page, pageSize });
}

export async function listReimbursementsService(pool, { actorId, query, offset, limit, page, pageSize }) {
  const cfg = await readReimbursementConfig(pool);
  assertReimbursementEnabled(cfg);

  const divisionId = query.divisionId ? String(query.divisionId) : null;
  const status = query.status ? String(query.status).toUpperCase() : null;
  const claimMonth = query.month ? String(query.month).slice(0, 10) : null;

  await assertCanAccessDivision(pool, { actorId, divisionId });
  await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_VIEW_DIVISION', divisionId });

  const total = await countReimbursements(pool, { employeeId: null, divisionId, status, claimMonth });
  const rows = await listReimbursements(pool, { employeeId: null, divisionId, status, claimMonth, offset, limit });

  return pagedResponse({ items: rows.map(reimbursementDto), total, page, pageSize });
}

export async function getByIdService(pool, { id, actorId }) {
  const cfg = await readReimbursementConfig(pool);
  assertReimbursementEnabled(cfg);

  const row = await getReimbursementById(pool, { id, forUpdate: false });
  if (!row) throw notFound('Reimbursement not found');

  const employeeId = await getEmployeeIdByUserId(pool, { userId: actorId });

  if (employeeId && String(row.employee_id) === String(employeeId)) {
    await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_VIEW_SELF', divisionId: null });
    return { item: reimbursementDto(row) };
  }

  await assertCanAccessDivision(pool, { actorId, divisionId: row.division_id || null });
  await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_VIEW_DIVISION', divisionId: row.division_id || null });

  return { item: reimbursementDto(row) };
}

export async function listReceiptsService(pool, { id, actorId }) {
  const cfg = await readReimbursementConfig(pool);
  assertReimbursementEnabled(cfg);

  const row = await getReimbursementById(pool, { id, forUpdate: false });
  if (!row) throw notFound('Reimbursement not found');

  const employeeId = await getEmployeeIdByUserId(pool, { userId: actorId });

  if (employeeId && String(row.employee_id) === String(employeeId)) {
    await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_VIEW_SELF', divisionId: null });
  } else {
    await assertCanAccessDivision(pool, { actorId, divisionId: row.division_id || null });
    await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_VIEW_DIVISION', divisionId: row.division_id || null });
  }

  const rows = await listReimbursementReceipts(pool, { reimbursementId: id });
  return rows.map(reimbursementReceiptDto);
}

export async function downloadReceiptService(pool, { reimbursementId, receiptId, actorId }) {
  const cfg = await readReimbursementConfig(pool);
  assertReimbursementEnabled(cfg);

  const reimb = await getReimbursementById(pool, { id: reimbursementId, forUpdate: false });
  if (!reimb) throw notFound('Reimbursement not found');

  const employeeId = await getEmployeeIdByUserId(pool, { userId: actorId });

  if (employeeId && String(reimb.employee_id) === String(employeeId)) {
    await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_VIEW_SELF', divisionId: null });
  } else {
    await assertCanAccessDivision(pool, { actorId, divisionId: reimb.division_id || null });
    await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_VIEW_DIVISION', divisionId: reimb.division_id || null });
  }

  const receipt = await getReimbursementReceipt(pool, { reimbursementId, receiptId });
  if (!receipt) throw notFound('Receipt not found');

  const relPath = receipt.storage_key;
  if (!relPath) throw notFound('Receipt not available');

  const buffer = await readReimbursementReceiptFromStorage({ relPath });

  return {
    fileName: receipt.file_name,
    contentType: receipt.content_type,
    buffer
  };
}

export async function listPaymentsService(pool, { id, actorId, offset, limit, page, pageSize }) {
  const cfg = await readReimbursementConfig(pool);
  assertReimbursementEnabled(cfg);

  const reimb = await getReimbursementById(pool, { id, forUpdate: false });
  if (!reimb) throw notFound('Reimbursement not found');

  const employeeId = await getEmployeeIdByUserId(pool, { userId: actorId });

  if (employeeId && String(reimb.employee_id) === String(employeeId)) {
    await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_VIEW_SELF', divisionId: null });
  } else {
    await assertCanAccessDivision(pool, { actorId, divisionId: reimb.division_id || null });
    await assertHasPermission(pool, { actorId, permissionCode: 'REIMBURSEMENT_VIEW_DIVISION', divisionId: reimb.division_id || null });
  }

  const total = await countReimbursementPayments(pool, { reimbursementId: id });
  const rows = await listReimbursementPayments(pool, { reimbursementId: id, offset, limit });
  return pagedResponse({ items: rows.map(reimbursementPaymentDto), total, page, pageSize });
}
