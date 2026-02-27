import crypto from 'node:crypto';

import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, notFound } from '../../../../shared/kernel/errors.js';

import { readIncomeConfig, assertIncomeEnabled, assertMonthOpenForIncomeDate } from '../../domain/services/incomePolicy.service.js';

import { getIncomeById } from '../../infrastructure/persistence/income.repository.pg.js';
import { getIncomeDocument, insertIncomeDocument, listIncomeDocuments } from '../../infrastructure/persistence/incomeDocument.repository.pg.js';

import { storeIncomeDocument, readIncomeDocumentFromStorage } from '../../infrastructure/storage/incomeDocumentStorage.adapter.js';

import { incomeDocumentDto } from '../dto/incomeDocument.dto.js';

function toIsoDateOnly(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export async function uploadIncomeDocumentUsecase(pool, { id, body, actorId, requestId, overrideReason }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);

  const fileName = String(body.fileName || '').trim();
  const contentType = String(body.contentType || '').trim();
  const fileBase64 = String(body.fileBase64 || '').trim();

  if (!fileName) throw badRequest('fileName is required');
  if (!contentType) throw badRequest('contentType is required');
  if (!fileBase64) throw badRequest('fileBase64 is required');

  return withTransaction(pool, async (client) => {
    const inc = await getIncomeById(client, { id, forUpdate: true });
    if (!inc) throw notFound('Income not found');

    await assertMonthOpenForIncomeDate(client, {
      incomeDate: toIsoDateOnly(inc.income_date),
      actorId,
      overrideReason
    });

    const stored = await storeIncomeDocument({ incomeId: inc.id, fileName, contentType, fileBase64 });

    const inserted = await insertIncomeDocument(client, {
      id: crypto.randomUUID(),
      income_id: inc.id,
      file_name: fileName,
      content_type: contentType,
      file_size: stored.fileSize,
      storage_key: stored.relPath,
      uploaded_by: actorId
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'INCOME_DOCUMENT',
      entityId: inserted.id,
      action: 'INCOME_DOC_UPLOADED',
      beforeData: null,
      afterData: {
        incomeId: inserted.income_id,
        fileName: inserted.file_name,
        contentType: inserted.content_type,
        fileSize: inserted.file_size
      },
      actorId,
      actorRole: null,
      reason: null
    });

    return incomeDocumentDto(inserted);
  });
}

export async function listIncomeDocumentsUsecase(pool, { id }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);

  const inc = await getIncomeById(pool, { id, forUpdate: false });
  if (!inc) throw notFound('Income not found');

  const rows = await listIncomeDocuments(pool, { incomeId: id });
  return rows.map(incomeDocumentDto);
}

export async function downloadIncomeDocumentUsecase(pool, { incomeId, docId }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);

  const doc = await getIncomeDocument(pool, { incomeId, docId });
  if (!doc) throw notFound('Document not found');

  const relPath = doc.storage_key;
  if (!relPath) throw notFound('Document not available');

  const buffer = await readIncomeDocumentFromStorage({ relPath });

  return {
    fileName: doc.file_name,
    contentType: doc.content_type,
    buffer
  };
}
