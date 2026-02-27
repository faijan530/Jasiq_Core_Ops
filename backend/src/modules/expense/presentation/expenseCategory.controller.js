import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import {
  expenseCategoryCreateSchema,
  expenseCategoryUpdateSchema
} from './expense.validators.js';

import { createCategoryService, listActiveCategoriesService, updateCategoryService } from '../application/services/expenseCategory.service.js';

export function expenseCategoryController({ pool }) {
  return {
    listActive: asyncHandler(async (req, res) => {
      const items = await listActiveCategoriesService(pool);
      res.json({ items });
    }),

    create: asyncHandler(async (req, res) => {
      const body = validate(expenseCategoryCreateSchema, req.body);
      const item = await createCategoryService(pool, {
        code: body.code,
        name: body.name,
        description: body.description || null,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.status(201).json({ item });
    }),

    update: asyncHandler(async (req, res) => {
      const body = validate(expenseCategoryUpdateSchema, req.body);
      const item = await updateCategoryService(pool, {
        id: req.params.id,
        patch: body,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.json({ item });
    })
  };
}
