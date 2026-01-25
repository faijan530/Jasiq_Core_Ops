import Joi from 'joi';

import { asyncHandler } from '../../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../../shared/kernel/validation.js';
import { parsePagination, pagedResponse } from '../../../../shared/kernel/pagination.js';
import { notFound } from '../../../../shared/kernel/errors.js';

import { toProjectDto } from '../domain/project.js';
import { createProject, getProject, listProjectsPaged, updateProjectFields } from '../service/projectService.js';

const createSchema = Joi.object({
  divisionId: Joi.string().guid({ version: 'uuidv4' }).required(),
  code: Joi.string().max(30).required(),
  name: Joi.string().max(150).required(),
  reason: Joi.string().allow('', null)
});

const updateSchema = Joi.object({
  name: Joi.string().max(150).allow('', null),
  isActive: Joi.boolean(),
  reason: Joi.when('isActive', {
    is: Joi.boolean(),
    then: Joi.string().trim().min(1).required().messages({
      'any.required': 'Reason is required',
      'string.empty': 'Reason is required',
      'string.min': 'Reason is required'
    }),
    otherwise: Joi.string().allow('', null)
  })
});

export function projectController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const divisionId = req.query.divisionId ? String(req.query.divisionId) : null;

      const { rows, total } = await listProjectsPaged(pool, { divisionId, offset, limit });
      res.json(pagedResponse({
        items: rows.map(toProjectDto),
        total,
        page,
        pageSize
      }));
    }),

    getById: asyncHandler(async (req, res) => {
      const row = await getProject(pool, req.params.id);
      if (!row) throw notFound('Project not found');
      res.json({ item: toProjectDto(row) });
    }),

    create: asyncHandler(async (req, res) => {
      const body = validate(createSchema, req.body);
      const created = await createProject(pool, {
        divisionId: body.divisionId,
        code: body.code,
        name: body.name,
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason
      });
      res.status(201).json({ item: toProjectDto(created) });
    }),

    update: asyncHandler(async (req, res) => {
      const body = validate(updateSchema, req.body);
      const updated = await updateProjectFields(pool, {
        id: req.params.id,
        name: body.name ?? null,
        isActive: body.isActive,
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason
      });
      res.json({ item: toProjectDto(updated) });
    })
  };
}
