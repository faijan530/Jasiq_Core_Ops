import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import {
  createOverrideSchema,
  listOverridesQuerySchema,
  approveOverrideSchema,
  rejectOverrideSchema,
  executeOverrideSchema
} from '../validators/overrides.validator.js';

import {
  createOverrideService,
  listOverridesService,
  approveOverrideService,
  rejectOverrideService,
  executeOverrideService
} from '../services/overrides.service.js';

export function overridesController({ pool }) {
  return {
    create: asyncHandler(async (req, res) => {
      const body = validate(createOverrideSchema, req.body);
      const item = await createOverrideService(pool, {
        body: {
          overrideType: body.overrideType,
          divisionId: body.divisionId ? String(body.divisionId) : null,
          targetEntityType: body.targetEntityType,
          targetEntityId: body.targetEntityId,
          requestedAction: body.requestedAction,
          reason: body.reason
        },
        actorId: req.auth.userId,
        actorRole: req.auth?.claims?.role || null,
        requestId: req.requestId
      });
      res.status(201).json({ item });
    }),

    list: asyncHandler(async (req, res) => {
      const query = validate(listOverridesQuerySchema, req.query);
      const payload = await listOverridesService(pool, {
        actorId: req.auth.userId,
        query: {
          ...query,
          divisionId: query.divisionId ? String(query.divisionId) : null
        }
      });
      res.json(payload);
    }),

    approve: asyncHandler(async (req, res) => {
      const body = validate(approveOverrideSchema, req.body);
      const item = await approveOverrideService(pool, {
        id: req.params.id,
        approvalReason: body.approvalReason,
        actorId: req.auth.userId,
        actorRole: req.auth?.claims?.role || null,
        requestId: req.requestId
      });
      res.json({ item });
    }),

    reject: asyncHandler(async (req, res) => {
      const body = validate(rejectOverrideSchema, req.body);
      const item = await rejectOverrideService(pool, {
        id: req.params.id,
        approvalReason: body.approvalReason,
        actorId: req.auth.userId,
        actorRole: req.auth?.claims?.role || null,
        requestId: req.requestId
      });
      res.json({ item });
    }),

    execute: asyncHandler(async (req, res) => {
      const body = validate(executeOverrideSchema, req.body);
      const item = await executeOverrideService(pool, {
        id: req.params.id,
        actorId: req.auth.userId,
        actorRole: req.auth?.claims?.role || null,
        requestId: req.requestId,
        reason: body.reason || null
      });
      res.json({ item });
    })
  };
}
