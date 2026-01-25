import Joi from 'joi';

import { asyncHandler } from '../../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../../shared/kernel/validation.js';
import { parsePagination, pagedResponse } from '../../../../shared/kernel/pagination.js';
import { toAuditLogDto } from '../domain/audit.js';
import { listAuditLogsPaged } from '../service/auditService.js';

const querySchema = Joi.object({
  entityType: Joi.string().max(50).allow('', null),
  entityId: Joi.string().allow('', null),
  action: Joi.string().max(30).allow('', null),
  actorId: Joi.string().allow('', null),
  requestId: Joi.string().max(60).allow('', null),
  createdFrom: Joi.date().iso().allow('', null),
  createdTo: Joi.date().iso().allow('', null)
});

export function auditController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const q = validate(querySchema, req.query);

      const filters = {
        entityType: (q.entityType && q.entityType !== 'undefined') ? q.entityType : null,
        entityId: (q.entityId && q.entityId !== 'undefined') ? (() => {
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q.entityId)) {
            throw new Error('entityId must be a valid UUID v4');
          }
          return q.entityId;
        })() : null,
        action: (q.action && q.action !== 'undefined') ? q.action : null,
        actorId: (q.actorId && q.actorId !== 'undefined') ? q.actorId : null,
        requestId: (q.requestId && q.requestId !== 'undefined') ? q.requestId : null,
        createdFrom: (q.createdFrom && q.createdFrom !== 'undefined') ? q.createdFrom : null,
        createdTo: (q.createdTo && q.createdTo !== 'undefined') ? q.createdTo : null
      };

      const { rows, total } = await listAuditLogsPaged(pool, { filters, offset, limit });

      res.json(pagedResponse({
        items: rows.map(toAuditLogDto),
        total,
        page,
        pageSize
      }));
    })
  };
}
