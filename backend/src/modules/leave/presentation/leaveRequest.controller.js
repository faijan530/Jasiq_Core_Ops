import Joi from 'joi';

import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import { grantLeaveBalanceSchema } from '../application/dto/leaveBalance.dto.js';
import { createLeaveRequestSchema, listLeaveRequestsQuerySchema, listLeaveBalancesQuerySchema } from '../application/dto/leaveRequest.dto.js';
import { leaveDecisionSchema } from '../application/dto/leaveDecision.dto.js';

import { grantLeaveBalanceUsecase } from '../application/usecases/grantLeaveBalance.usecase.js';
import { getLeaveBalancesUsecase } from '../application/usecases/getLeaveBalances.usecase.js';
import { createLeaveRequestUsecase } from '../application/usecases/createLeaveRequest.usecase.js';
import { cancelLeaveRequestUsecase } from '../application/usecases/cancelLeaveRequest.usecase.js';
import { approveLeaveRequestUsecase } from '../application/usecases/approveLeaveRequest.usecase.js';
import { rejectLeaveRequestUsecase } from '../application/usecases/rejectLeaveRequest.usecase.js';
import { listLeaveRequestsUsecase } from '../application/usecases/listLeaveRequests.usecase.js';

import { uploadLeaveAttachmentUsecase } from '../application/usecases/uploadLeaveAttachment.usecase.js';
import { listLeaveAttachmentsUsecase } from '../application/usecases/listLeaveAttachments.usecase.js';
import { getLeaveAttachmentDownloadUsecase } from '../application/usecases/getLeaveAttachmentDownload.usecase.js';

import { toLeaveBalanceDto, toLeaveRequestDto, toLeaveAttachmentDto } from '../application/mappers/leave.mapper.js';

const attachmentBodySchema = Joi.object({
  fileName: Joi.string().trim().min(1).max(255).required(),
  mimeType: Joi.string().trim().min(1).max(100).required(),
  sizeBytes: Joi.number().integer().min(1).required(),
  storageKey: Joi.string().trim().min(1).required()
});

const approveBodySchema = Joi.object({
  reason: Joi.string().trim().min(1).optional()
});

export function leaveRequestController({ pool }) {
  return {
    listBalances: asyncHandler(async (req, res) => {
      const query = validate(listLeaveBalancesQuerySchema, req.query);
      const rows = await getLeaveBalancesUsecase(pool, { employeeId: query.employeeId || null, year: query.year ?? null });
      res.json({ items: rows.map(toLeaveBalanceDto) });
    }),

    grantBalance: asyncHandler(async (req, res) => {
      const body = validate(grantLeaveBalanceSchema, req.body);
      const row = await grantLeaveBalanceUsecase(pool, { body, actorId: req.auth.userId, requestId: req.requestId });
      res.status(201).json({ item: row });
    }),

    listRequests: asyncHandler(async (req, res) => {
      const query = validate(listLeaveRequestsQuerySchema, req.query);
      const payload = await listLeaveRequestsUsecase(pool, { query });
      res.json({
        items: (payload.items || []).map(toLeaveRequestDto),
        page: payload.page,
        pageSize: payload.pageSize,
        total: payload.total
      });
    }),

    createRequest: asyncHandler(async (req, res) => {
      const body = validate(createLeaveRequestSchema, req.body);
      const row = await createLeaveRequestUsecase(pool, { body, actorId: req.auth.userId, requestId: req.requestId });
      res.status(201).json({ item: row });
    }),

    cancel: asyncHandler(async (req, res) => {
      const body = validate(leaveDecisionSchema, req.body);
      const row = await cancelLeaveRequestUsecase(pool, { id: req.params.id, reason: body.reason, actorId: req.auth.userId, requestId: req.requestId });
      res.json({ item: row });
    }),

    approve: asyncHandler(async (req, res) => {
      const body = validate(approveBodySchema, req.body);
      const row = await approveLeaveRequestUsecase(pool, {
        id: req.params.id,
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason || null
      });
      res.json({ item: row });
    }),

    reject: asyncHandler(async (req, res) => {
      const body = validate(leaveDecisionSchema, req.body);
      const row = await rejectLeaveRequestUsecase(pool, { id: req.params.id, reason: body.reason, actorId: req.auth.userId, requestId: req.requestId });
      res.json({ item: row });
    }),

    uploadAttachment: asyncHandler(async (req, res) => {
      const body = validate(attachmentBodySchema, req.body);
      const row = await uploadLeaveAttachmentUsecase(pool, {
        leaveRequestId: req.params.id,
        body,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.status(201).json({ item: toLeaveAttachmentDto(row) });
    }),

    listAttachments: asyncHandler(async (req, res) => {
      const rows = await listLeaveAttachmentsUsecase(pool, { leaveRequestId: req.params.id, actorId: req.auth.userId });
      res.json({ items: rows.map(toLeaveAttachmentDto) });
    }),

    downloadAttachment: asyncHandler(async (req, res) => {
      const row = await getLeaveAttachmentDownloadUsecase(pool, { leaveRequestId: req.params.id, attId: req.params.attId, actorId: req.auth.userId });
      res.json({ item: toLeaveAttachmentDto(row) });
    })
  };
}
