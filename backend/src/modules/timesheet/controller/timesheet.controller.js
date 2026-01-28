import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import { workLogUpsertSchema } from '../dto/workLogUpsert.dto.js';
import { submitTimesheetSchema } from '../dto/submitTimesheet.dto.js';
import { decisionSchema } from '../dto/decision.dto.js';
import { toTimesheetDto } from '../dto/timesheet.response.dto.js';
import { toApprovalsQueueDto } from '../dto/approvalsQueue.response.dto.js';

import {
  approveTimesheet,
  getMyTimesheets,
  getTimesheetByIdService,
  listApprovals,
  rejectTimesheet,
  requestRevision,
  submitTimesheet,
  upsertWorklogService
} from '../service/timesheet.service.js';

export function timesheetController({ pool }) {
  return {
    my: asyncHandler(async (req, res) => {
      const payload = await getMyTimesheets(pool, { actorId: req.auth.userId, query: req.query });
      res.json(payload);
    }),

    getById: asyncHandler(async (req, res) => {
      const payload = await getTimesheetByIdService(pool, { id: req.params.id });
      res.json(toTimesheetDto(payload));
    }),

    upsertWorklog: asyncHandler(async (req, res) => {
      const body = validate(workLogUpsertSchema, req.body);
      const payload = await upsertWorklogService(pool, {
        employeeId: body.employeeId,
        workDate: body.workDate,
        task: body.task,
        hours: body.hours,
        description: body.description || null,
        projectId: body.projectId || null,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.status(201).json(toTimesheetDto(payload));
    }),

    submit: asyncHandler(async (req, res) => {
      validate(submitTimesheetSchema, req.body);
      const payload = await submitTimesheet(pool, { id: req.params.id, actorId: req.auth.userId, requestId: req.requestId });
      res.json({ item: payload });
    }),

    approve: asyncHandler(async (req, res) => {
      validate(submitTimesheetSchema, req.body);
      const payload = await approveTimesheet(pool, { id: req.params.id, actorId: req.auth.userId, requestId: req.requestId });
      res.json({ item: payload });
    }),

    reject: asyncHandler(async (req, res) => {
      const body = validate(decisionSchema, req.body);
      const payload = await rejectTimesheet(pool, { id: req.params.id, actorId: req.auth.userId, requestId: req.requestId, reason: body.reason });
      res.json({ item: payload });
    }),

    requestRevision: asyncHandler(async (req, res) => {
      const body = validate(decisionSchema, req.body);
      const payload = await requestRevision(pool, { id: req.params.id, actorId: req.auth.userId, requestId: req.requestId, reason: body.reason });
      res.json({ item: payload });
    }),

    approvals: asyncHandler(async (req, res) => {
      const payload = await listApprovals(pool, { query: req.query });
      res.json(toApprovalsQueueDto(payload));
    })
  };
}
