import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import { runDataQualitySchema, listFindingsQuerySchema } from '../validators/dataQuality.validator.js';
import {
  runDataQualityChecksService,
  listFindingsService,
  acknowledgeFindingService,
  resolveFindingService
} from '../services/dataQuality.service.js';

export function dataQualityController({ pool }) {
  return {
    run: asyncHandler(async (req, res) => {
      const body = validate(runDataQualitySchema, req.body);
      const payload = await runDataQualityChecksService(pool, {
        actorId: req.auth.userId,
        actorRole: req.auth?.claims?.role || null,
        requestId: req.requestId,
        divisionId: body.divisionId ? String(body.divisionId) : null
      });
      res.status(201).json(payload);
    }),

    listFindings: asyncHandler(async (req, res) => {
      const query = validate(listFindingsQuerySchema, req.query);
      const payload = await listFindingsService(pool, {
        actorId: req.auth.userId,
        query: {
          ...query,
          divisionId: query.divisionId ? String(query.divisionId) : null
        }
      });
      res.json(payload);
    }),

    acknowledge: asyncHandler(async (req, res) => {
      const item = await acknowledgeFindingService(pool, {
        id: req.params.id,
        actorId: req.auth.userId,
        actorRole: req.auth?.claims?.role || null,
        requestId: req.requestId
      });
      res.json({ item });
    }),

    resolve: asyncHandler(async (req, res) => {
      const item = await resolveFindingService(pool, {
        id: req.params.id,
        actorId: req.auth.userId,
        actorRole: req.auth?.claims?.role || null,
        requestId: req.requestId
      });
      res.json({ item });
    })
  };
}
