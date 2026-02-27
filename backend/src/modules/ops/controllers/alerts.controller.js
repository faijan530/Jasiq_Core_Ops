import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import { listAlertsQuerySchema } from '../validators/alerts.validator.js';
import { listAlertsService, acknowledgeAlertService, resolveAlertService } from '../services/alerts.service.js';

export function alertsController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const query = validate(listAlertsQuerySchema, req.query);
      const payload = await listAlertsService(pool, {
        actorId: req.auth.userId,
        query: {
          ...query,
          divisionId: query.divisionId ? String(query.divisionId) : null
        }
      });
      res.json(payload);
    }),

    acknowledge: asyncHandler(async (req, res) => {
      const item = await acknowledgeAlertService(pool, {
        id: req.params.id,
        actorId: req.auth.userId,
        actorRole: req.auth?.claims?.role || null,
        requestId: req.requestId
      });
      res.json({ item });
    }),

    resolve: asyncHandler(async (req, res) => {
      const item = await resolveAlertService(pool, {
        id: req.params.id,
        actorId: req.auth.userId,
        actorRole: req.auth?.claims?.role || null,
        requestId: req.requestId
      });
      res.json({ item });
    })
  };
}
