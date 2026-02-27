import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import { listInboxQuerySchema, inboxActionSchema } from '../validators/opsInbox.validator.js';
import { listOpsInboxService, executeInboxActionService } from '../services/opsInbox.service.js';

export function opsInboxController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const query = validate(listInboxQuerySchema, req.query);
      const payload = await listOpsInboxService(pool, {
        actorId: req.auth.userId,
        divisionId: query.divisionId ? String(query.divisionId) : null,
        limit: query.limit
      });
      res.json(payload);
    }),

    action: asyncHandler(async (req, res) => {
      const body = validate(inboxActionSchema, req.body);
      const result = await executeInboxActionService(pool, {
        actorId: req.auth.userId,
        actorRole: req.auth?.claims?.role || null,
        requestId: req.requestId,
        itemType: body.itemType,
        entityId: body.entityId,
        action: body.action,
        reason: body.reason || null
      });
      res.status(200).json({ item: result });
    })
  };
}
