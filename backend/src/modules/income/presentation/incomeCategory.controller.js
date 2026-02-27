import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import { incomeCategoryCreateSchema, incomeCategoryUpdateSchema } from './income.validators.js';

import { createIncomeCategoryUsecase } from '../application/usecases/createIncomeCategory.usecase.js';
import { updateIncomeCategoryUsecase } from '../application/usecases/updateIncomeCategory.usecase.js';
import { listIncomeCategoriesUsecase } from '../application/usecases/listIncomeCategories.usecase.js';

export function incomeCategoryController({ pool }) {
  return {
    listActive: asyncHandler(async (req, res) => {
      const items = await listIncomeCategoriesUsecase(pool, { activeOnly: true });
      res.json({ items });
    }),

    create: asyncHandler(async (req, res) => {
      const body = validate(incomeCategoryCreateSchema, req.body);
      const item = await createIncomeCategoryUsecase(pool, {
        code: body.code,
        name: body.name,
        description: body.description || null,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.status(201).json({ item });
    }),

    update: asyncHandler(async (req, res) => {
      const body = validate(incomeCategoryUpdateSchema, req.body);
      const item = await updateIncomeCategoryUsecase(pool, {
        id: req.params.id,
        patch: body,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.json({ item });
    })
  };
}
