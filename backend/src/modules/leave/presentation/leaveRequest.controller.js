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
import { getLeaveRequestByIdUsecase } from '../application/usecases/getLeaveRequestById.usecase.js';

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

    getRequestById: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const row = await getLeaveRequestByIdUsecase(pool, { id, actorId: req.auth.userId, requestId: req.requestId });
      
      if (!row) {
        return res.status(404).json({ message: 'Leave request not found' });
      }
      
      res.json({ item: toLeaveRequestDto(row) });
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
    }),

    team: asyncHandler(async (req, res) => {
      const managerUserId = req.auth?.userId;
      const status = req.query?.status || 'pending';

      if (!managerUserId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Resolve manager employee id (reporting_manager_id points to employee.id)
      const managerEmpRes = await pool.query(
        'SELECT employee_id FROM "user" WHERE id = $1',
        [managerUserId]
      );
      const managerEmployeeId = managerEmpRes.rows[0]?.employee_id;
      if (!managerEmployeeId) {
        return res.json([]);
      }

      // Get employees reporting to this manager
      let employeesResult = await pool.query(
        `SELECT id, first_name, last_name, employee_code FROM employee 
         WHERE reporting_manager_id = $1 AND status = 'ACTIVE'`,
        [managerEmployeeId]
      );

      if ((employeesResult.rows || []).length === 0) {
        // Fallback: if reporting lines are not configured, return all ACTIVE employees
        employeesResult = await pool.query(
          `SELECT id, first_name, last_name, employee_code
           FROM employee
           WHERE status = 'ACTIVE'
           ORDER BY first_name ASC, last_name ASC`
        );
      }

      const employees = employeesResult.rows;
      if (employees.length === 0) return res.json([]);

      const employeeIds = employees.map(e => e.id);
      const employeeMap = new Map(employees.map(e => [e.id, `${e.first_name} ${e.last_name}`]));
      const employeeCodeMap = new Map(employees.map(e => [e.id, e.employee_code]));

      // Get leave requests for team employees
      let query = `
        SELECT lr.id, lr.employee_id, lr.start_date, lr.end_date, lr.units, lr.reason, 
               lr.status, lr.created_at,
               lt.name as leave_type
        FROM leave_request lr
        JOIN leave_type lt ON lr.leave_type_id = lt.id
        WHERE lr.employee_id = ANY($1)
      `;
      
      const params = [employeeIds];
      
      if (status && status !== 'all') {
        query += ` AND lr.status = $${params.length + 1}`;
        params.push(status.toUpperCase());
      }
      
      query += ` ORDER BY lr.created_at DESC`;

      const leaveResult = await pool.query(query, params);

      const leaveRequests = leaveResult.rows.map(row => ({
        id: row.id,
        employeeId: row.employee_id,
        employeeName: employeeMap.get(row.employee_id) || 'Unknown',
        employeeCode: employeeCodeMap.get(row.employee_id) || null,
        startDate: row.start_date,
        endDate: row.end_date,
        leaveType: row.leave_type,
        days: row.units,
        reason: row.reason,
        status: row.status,
        submittedAt: row.created_at
      }));

      res.json(leaveRequests);
    })
  };
}
