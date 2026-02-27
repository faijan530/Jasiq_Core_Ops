import crypto from 'node:crypto';

import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, notFound } from '../../../../shared/kernel/errors.js';

import { readExpenseConfig, assertExpenseEnabled, assertMonthOpenForExpenseDate } from '../../domain/services/expensePolicy.service.js';

import { getExpenseById } from '../../infrastructure/repositories/expense.repository.js';
import { getExpenseReceipt, insertExpenseReceipt, listExpenseReceipts } from '../../infrastructure/repositories/expenseReceipt.repository.js';

import { storeExpenseReceipt, readExpenseReceiptFromStorage } from '../../infrastructure/storage/expenseReceipt.storage.js';

function toIsoDateOnly(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export async function uploadExpenseReceiptService(pool, { id, body, actorId, requestId, overrideReason }) {
  const cfg = await readExpenseConfig(pool);
  assertExpenseEnabled(cfg);

  const fileName = String(body.fileName || '').trim();
  const contentType = String(body.contentType || '').trim();
  const fileBase64 = String(body.fileBase64 || '').trim();

  if (!fileName) throw badRequest('fileName is required');
  if (!contentType) throw badRequest('contentType is required');
  if (!fileBase64) throw badRequest('fileBase64 is required');

  return withTransaction(pool, async (client) => {
    const exp = await getExpenseById(client, { id, forUpdate: true });
    if (!exp) throw notFound('Expense not found');

    await assertMonthOpenForExpenseDate(client, {
      expenseDate: toIsoDateOnly(exp.expense_date),
      actorId,
      overrideReason
    });

    const stored = await storeExpenseReceipt({ expenseId: exp.id, fileName, contentType, fileBase64 });

    const inserted = await insertExpenseReceipt(client, {
      id: crypto.randomUUID(),
      expense_id: exp.id,
      file_name: fileName,
      content_type: contentType,
      file_size: stored.fileSize,
      storage_key: stored.relPath,
      uploaded_by: actorId
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'EXPENSE_RECEIPT',
      entityId: inserted.id,
      action: 'EXPENSE_RECEIPT_UPLOADED',
      beforeData: null,
      afterData: {
        expenseId: inserted.expense_id,
        fileName: inserted.file_name,
        contentType: inserted.content_type,
        fileSize: inserted.file_size
      },
      actorId,
      actorRole: null,
      reason: null
    });

    return {
      id: inserted.id,
      expenseId: inserted.expense_id,
      fileName: inserted.file_name,
      contentType: inserted.content_type,
      fileSize: inserted.file_size,
      uploadedAt: inserted.uploaded_at,
      uploadedBy: inserted.uploaded_by
    };
  });
}

export async function listExpenseReceiptsService(pool, { id }) {
  const cfg = await readExpenseConfig(pool);
  assertExpenseEnabled(cfg);

  const exp = await getExpenseById(pool, { id, forUpdate: false });
  if (!exp) throw notFound('Expense not found');

  const rows = await listExpenseReceipts(pool, { expenseId: id });
  return rows.map((r) => ({
    id: r.id,
    expenseId: r.expense_id,
    fileName: r.file_name,
    contentType: r.content_type,
    fileSize: r.file_size,
    uploadedAt: r.uploaded_at,
    uploadedBy: r.uploaded_by
  }));
}

export async function downloadExpenseReceiptService(pool, { expenseId, receiptId }) {
  const cfg = await readExpenseConfig(pool);
  assertExpenseEnabled(cfg);

  const receipt = await getExpenseReceipt(pool, { expenseId, receiptId });
  if (!receipt) throw notFound('Receipt not found');

  const relPath = receipt.storage_key;
  if (!relPath) throw notFound('Receipt not available');

  const buffer = await readExpenseReceiptFromStorage({ relPath });

  return {
    fileName: receipt.file_name,
    contentType: receipt.content_type,
    buffer
  };
}
