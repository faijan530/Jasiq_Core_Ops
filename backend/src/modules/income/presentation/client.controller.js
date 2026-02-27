import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import { clientCreateSchema, clientUpdateSchema, clientListQuerySchema } from './income.validators.js';

import { createClientUsecase } from '../application/usecases/createClient.usecase.js';
import { updateClientUsecase } from '../application/usecases/updateClient.usecase.js';
import { listClientsUsecase } from '../application/usecases/listClients.usecase.js';

export function clientController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const query = validate(clientListQuerySchema, req.query);
      const payload = await listClientsUsecase(pool, { query });
      res.json(payload);
    }),

    create: asyncHandler(async (req, res) => {
      const body = validate(clientCreateSchema, req.body);
      const item = await createClientUsecase(pool, {
        body,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.status(201).json({ item });
    }),

    update: asyncHandler(async (req, res) => {
      const body = validate(clientUpdateSchema, req.body);
      const item = await updateClientUsecase(pool, {
        id: req.params.id,
        patch: body,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.json({ item });
    })
  };
}
