import crypto from 'node:crypto';

import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, forbidden } from '../../../../shared/kernel/errors.js';

import { readLeaveConfig, assertLeaveEnabled } from '../../domain/services/leavePolicy.service.js';
import { getLeaveRequestById } from '../../infrastructure/persistence/leaveRequest.repository.pg.js';
import { insertLeaveAttachment } from '../../infrastructure/persistence/leaveAttachment.repository.pg.js';
import { storeLeaveAttachmentMetadata } from '../../infrastructure/storage/leaveAttachmentStorage.service.js';

import { assertActorCanAccessEmployee } from './_access.js';

export async function uploadLeaveAttachmentUsecase(pool, { leaveRequestId, body, actorId, requestId }) {
  const cfg = await readLeaveConfig(pool);
  assertLeaveEnabled(cfg);
  if (!cfg.attachmentsEnabled) throw forbidden('Attachments are disabled');

  const fileName = String(body.fileName || '').trim();
  const mimeType = String(body.mimeType || '').trim();
  const sizeBytes = Number(body.sizeBytes || 0);
  const storageKey = String(body.storageKey || '').trim();

  if (!fileName) throw badRequest('fileName is required');
  if (!mimeType) throw badRequest('mimeType is required');
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) throw badRequest('sizeBytes is required');
  if (!storageKey) throw badRequest('storageKey is required');

  return withTransaction(pool, async (client) => {
    const reqRow = await getLeaveRequestById(client, { id: leaveRequestId, forUpdate: false });
    if (!reqRow) throw badRequest('Leave request not found');

    await assertActorCanAccessEmployee(client, {
      actorId,
      permissionCode: 'LEAVE_ATTACHMENT_UPLOAD',
      employeeId: reqRow.employee_id
    });

    await storeLeaveAttachmentMetadata({ storageKey });

    const inserted = await insertLeaveAttachment(client, {
      id: crypto.randomUUID(),
      leave_request_id: leaveRequestId,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      storage_key: storageKey,
      uploaded_by: actorId
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'LEAVE_ATTACHMENT',
      entityId: inserted.id,
      action: 'LEAVE_ATTACHMENT_UPLOAD',
      beforeData: null,
      afterData: {
        leave_request_id: inserted.leave_request_id,
        file_name: inserted.file_name,
        mime_type: inserted.mime_type,
        size_bytes: inserted.size_bytes,
        storage_key: inserted.storage_key
      },
      actorId,
      actorRole: null,
      reason: null
    });

    return inserted;
  });
}
