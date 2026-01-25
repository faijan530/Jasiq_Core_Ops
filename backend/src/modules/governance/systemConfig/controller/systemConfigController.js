import Joi from 'joi';

import { asyncHandler } from '../../../../shared/kernel/asyncHandler.js';
import { parsePagination, pagedResponse } from '../../../../shared/kernel/pagination.js';
import { validate } from '../../../../shared/kernel/validation.js';

import { toSystemConfigDto } from '../domain/systemConfig.js';
import { getSystemConfigByKey, listSystemConfigsPaged, setSystemConfigValue } from '../service/systemConfigService.js';

const upsertSchema = Joi.object({
  value: Joi.string().required(),
  description: Joi.string().allow('', null),
  reason: Joi.string().allow('', null)
});

export function systemConfigController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const { rows, total } = await listSystemConfigsPaged(pool, { offset, limit });
      res.json(pagedResponse({ items: rows.map(toSystemConfigDto), total, page, pageSize }));
    }),

    getByKey: asyncHandler(async (req, res) => {
      const row = await getSystemConfigByKey(pool, req.params.key);
      res.json({ item: toSystemConfigDto(row) });
    }),

    upsert: asyncHandler(async (req, res) => {
      const body = validate(upsertSchema, req.body);
      const row = await setSystemConfigValue(pool, {
        key: req.params.key,
        value: body.value,
        description: body.description ?? null,
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason
      });
      res.json({ item: toSystemConfigDto(row) });
    })
  };
}
