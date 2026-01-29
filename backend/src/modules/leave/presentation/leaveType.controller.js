import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import { createLeaveTypeSchema, updateLeaveTypeSchema } from '../application/dto/leaveType.dto.js';
import { createLeaveTypeUsecase } from '../application/usecases/createLeaveType.usecase.js';
import { updateLeaveTypeUsecase } from '../application/usecases/updateLeaveType.usecase.js';
import { listLeaveTypesUsecase } from '../application/usecases/listLeaveTypes.usecase.js';
import { toLeaveTypeDto } from '../application/mappers/leave.mapper.js';

export function leaveTypeController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const includeInactive = String(req.query?.includeInactive || '').toLowerCase() === 'true';
      const rows = await listLeaveTypesUsecase(pool, { includeInactive });
      res.json({ items: rows.map(toLeaveTypeDto) });
    }),

    create: asyncHandler(async (req, res) => {
      const body = validate(createLeaveTypeSchema, req.body);
      const row = await createLeaveTypeUsecase(pool, { body, actorId: req.auth.userId, requestId: req.requestId });
      res.status(201).json({ item: toLeaveTypeDto(row) });
    }),

    update: asyncHandler(async (req, res) => {
      const body = validate(updateLeaveTypeSchema, req.body);
      const row = await updateLeaveTypeUsecase(pool, { id: req.params.id, body, actorId: req.auth.userId, requestId: req.requestId });
      res.json({ item: toLeaveTypeDto(row) });
    })
  };
}
