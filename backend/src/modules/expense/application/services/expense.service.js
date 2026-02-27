import crypto from 'node:crypto';

import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict, notFound } from '../../../../shared/kernel/errors.js';
import { parsePagination, pagedResponse } from '../../../../shared/kernel/pagination.js';

import { EXPENSE_STATUS } from '../../domain/entities/expense.entity.js';
import {
  assertAmount,
  assertDivisionIfScoped,
  assertExpenseDate,
  assertExpenseEnabled,
  assertReimbursementFields,
  assertMonthOpenForExpenseDate,
  readExpenseConfig
} from '../../domain/services/expensePolicy.service.js';

import { expenseDto } from '../dto/expense.dto.js';

import { getExpenseCategoryById } from '../../infrastructure/repositories/expenseCategory.repository.js';
import { getEmployeeIdByUserId, getExpenseById, insertExpense, listExpenses as listExpensesRepo, updateExpenseDraft } from '../../infrastructure/repositories/expense.repository.js';
import { sumExpensePayments } from '../../infrastructure/repositories/expensePayment.repository.js';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function createExpenseService(pool, { body, actorId, requestId }) {
  const cfg = await readExpenseConfig(pool);
  assertExpenseEnabled(cfg);

  const amount = assertAmount(body.amount);
  const expenseDate = assertExpenseDate(cfg, { expenseDate: body.expenseDate, todayDate: todayIso() });
  const isReimbursement = Boolean(body.isReimbursement);
  assertDivisionIfScoped(cfg, { divisionId: body.divisionId || null });

  return withTransaction(pool, async (client) => {
    const employeeId = isReimbursement
      ? (body.employeeId || (await getEmployeeIdByUserId(client, { userId: actorId })))
      : (body.employeeId || null);

    assertReimbursementFields({ isReimbursement, employeeId });

    await assertMonthOpenForExpenseDate(client, {
      expenseDate,
      actorId,
      overrideReason: body.monthCloseOverrideReason
    });

    const cat = await getExpenseCategoryById(client, { id: body.categoryId });
    if (!cat || !cat.is_active) throw badRequest('Invalid category');

    const inserted = await insertExpense(client, {
      id: crypto.randomUUID(),
      expense_date: expenseDate,
      category_id: body.categoryId,
      title: String(body.title || '').trim(),
      description: body.description ? String(body.description).trim() : null,
      amount,
      currency: body.currency ? String(body.currency).trim() : 'INR',
      division_id: body.divisionId || null,
      project_id: body.projectId || null,
      paid_by_method: String(body.paidByMethod || '').toUpperCase(),
      vendor_name: body.vendorName ? String(body.vendorName).trim() : null,
      is_reimbursement: Boolean(body.isReimbursement),
      employee_id: employeeId,
      status: EXPENSE_STATUS.DRAFT,
      submitted_at: null,
      submitted_by: null,
      approved_at: null,
      approved_by: null,
      rejected_at: null,
      rejected_by: null,
      decision_reason: null,
      created_by: actorId,
      version: 1
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'EXPENSE',
      entityId: inserted.id,
      action: 'EXPENSE_CREATE',
      beforeData: null,
      afterData: {
        expenseId: inserted.id,
        divisionId: inserted.division_id,
        categoryId: inserted.category_id,
        status: inserted.status,
        amount: inserted.amount
      },
      actorId,
      actorRole: null,
      reason: null
    });

    return expenseDto(inserted);
  });
}

export async function updateExpenseService(pool, { id, body, actorId, requestId }) {
  const cfg = await readExpenseConfig(pool);
  assertExpenseEnabled(cfg);

  const expectedVersion = Number(body.version);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw badRequest('version is required');

  return withTransaction(pool, async (client) => {
    const current = await getExpenseById(client, { id, forUpdate: true });
    if (!current) throw notFound('Expense not found');
    if (String(current.status).toUpperCase() !== EXPENSE_STATUS.DRAFT) throw badRequest('Only DRAFT expenses can be updated');

    const patch = {};

    if (body.amount !== undefined) patch.amount = assertAmount(body.amount);
    if (body.expenseDate !== undefined) {
      patch.expense_date = assertExpenseDate(cfg, { expenseDate: body.expenseDate, todayDate: todayIso() });
    }

    const divisionId = body.divisionId !== undefined ? body.divisionId : current.division_id;
    assertDivisionIfScoped(cfg, { divisionId: divisionId || null });

    const isReimbursement = body.isReimbursement !== undefined ? Boolean(body.isReimbursement) : Boolean(current.is_reimbursement);
    const employeeId = body.employeeId !== undefined ? body.employeeId : current.employee_id;
    assertReimbursementFields({ isReimbursement, employeeId });

    if (body.categoryId !== undefined) {
      const cat = await getExpenseCategoryById(client, { id: body.categoryId });
      if (!cat || !cat.is_active) throw badRequest('Invalid category');
      patch.category_id = body.categoryId;
    }

    if (body.title !== undefined) patch.title = String(body.title || '').trim();
    if (body.description !== undefined) patch.description = String(body.description || '').trim();
    if (body.currency !== undefined) patch.currency = String(body.currency || '').trim();
    if (body.divisionId !== undefined) patch.division_id = body.divisionId;
    if (body.projectId !== undefined) patch.project_id = body.projectId;
    if (body.paidByMethod !== undefined) patch.paid_by_method = String(body.paidByMethod || '').toUpperCase();
    if (body.vendorName !== undefined) patch.vendor_name = String(body.vendorName || '').trim();
    if (body.isReimbursement !== undefined) patch.is_reimbursement = Boolean(body.isReimbursement);
    if (body.employeeId !== undefined) patch.employee_id = body.employeeId;

    const expenseDate = patch.expense_date ?? current.expense_date;

    await assertMonthOpenForExpenseDate(client, {
      expenseDate: String(expenseDate).slice(0, 10),
      actorId,
      overrideReason: body.monthCloseOverrideReason
    });

    const updated = await updateExpenseDraft(client, {
      id,
      patch,
      actorId,
      expectedVersion
    });

    if (!updated) throw conflict('Expense was updated by another user');

    await writeAuditLog(client, {
      requestId,
      entityType: 'EXPENSE',
      entityId: updated.id,
      action: 'EXPENSE_UPDATE',
      beforeData: { status: current.status, amount: current.amount, version: current.version },
      afterData: { status: updated.status, amount: updated.amount, version: updated.version },
      actorId,
      actorRole: null,
      reason: null
    });

    return expenseDto(updated);
  });
}

export async function getExpenseByIdService(pool, { id }) {
  const cfg = await readExpenseConfig(pool);
  assertExpenseEnabled(cfg);

  const row = await getExpenseById(pool, { id, forUpdate: false });
  if (!row) throw notFound('Expense not found');

  const totalPaid = Number(await sumExpensePayments(pool, { expenseId: id }));
  const amt = Number(row.amount || 0);
  const remainingAmount = Math.max(0, amt - totalPaid);

  return { item: expenseDto(row), remainingAmount, totalPaid };
}

export async function listExpensesService(pool, { query }) {
  const cfg = await readExpenseConfig(pool);
  assertExpenseEnabled(cfg);

  const page = Number(query.page || 1);
  const pageSize = Number(query.size || query.pageSize || 20);
  if (!Number.isInteger(page) || page < 1) throw badRequest('Invalid page');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) throw badRequest('Invalid size');

  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  const status = query.status ? String(query.status).toUpperCase() : null;

  const res = await listExpensesRepo(pool, {
    status,
    divisionId: query.divisionId ? String(query.divisionId) : null,
    categoryId: query.categoryId ? String(query.categoryId) : null,
    from: query.from ? String(query.from).slice(0, 10) : null,
    to: query.to ? String(query.to).slice(0, 10) : null,
    minAmount: query.minAmount !== undefined ? Number(query.minAmount) : null,
    maxAmount: query.maxAmount !== undefined ? Number(query.maxAmount) : null,
    reimbursement: query.reimbursement !== undefined ? Boolean(query.reimbursement) : null,
    search: query.search ? String(query.search).trim() : null,
    offset,
    limit
  });

  return pagedResponse({ items: res.items.map(expenseDto), total: res.total, page, pageSize });
}
