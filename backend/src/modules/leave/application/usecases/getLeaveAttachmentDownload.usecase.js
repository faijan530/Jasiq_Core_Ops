import { forbidden, badRequest } from '../../../../shared/kernel/errors.js';

import { readLeaveConfig, assertLeaveEnabled } from '../../domain/services/leavePolicy.service.js';
import { getLeaveRequestById } from '../../infrastructure/persistence/leaveRequest.repository.pg.js';
import { getLeaveAttachment } from '../../infrastructure/persistence/leaveAttachment.repository.pg.js';
import { assertActorCanAccessEmployee } from './_access.js';

export async function getLeaveAttachmentDownloadUsecase(pool, { leaveRequestId, attId, actorId }) {
  const cfg = await readLeaveConfig(pool);
  assertLeaveEnabled(cfg);
  if (!cfg.attachmentsEnabled) throw forbidden('Attachments are disabled');

  const reqRow = await getLeaveRequestById(pool, { id: leaveRequestId, forUpdate: false });
  if (!reqRow) throw badRequest('Leave request not found');

  await assertActorCanAccessEmployee(pool, {
    actorId,
    permissionCode: 'LEAVE_ATTACHMENT_READ',
    employeeId: reqRow.employee_id
  });

  const att = await getLeaveAttachment(pool, { leaveRequestId, attId });
  if (!att) throw badRequest('Attachment not found');
  return att;
}
