import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import { markAttendanceSchema, bulkMarkAttendanceSchema, overrideAttendanceSchema } from '../dto/attendanceSchemas.js';
import {
  toAttendanceMonthDto,
  toAttendanceBulkResultDto,
  toAttendanceWriteResultDto
} from '../dto/attendanceResponse.dto.js';
import { toAttendanceSummaryDto } from '../dto/attendanceSummary.dto.js';

import {
  bulkMarkAttendance,
  getAttendanceByMonth,
  getAttendanceSummary,
  markAttendance,
  overrideAttendance,
  getTeamAttendanceByWeek,
  getTeamAttendanceByMonth
} from '../service/attendanceService.js';

import { getTodayDateOnly } from '../repository/attendanceRepository.js';

export function attendanceController({ pool }) {
  return {
    today: asyncHandler(async (req, res) => {
      const client = await pool.connect();
      try {
        const todayDate = await getTodayDateOnly(client);
        res.json({ todayDate });
      } finally {
        client.release();
      }
    }),

    mark: asyncHandler(async (req, res) => {
      console.info('[attendance.controller.mark] received request', { 
        body: req.body, 
        userId: req.auth?.userId, 
        requestId: req.requestId 
      });
      
      const body = validate(markAttendanceSchema, req.body);
      
      console.info('[attendance.controller.mark] validation passed', { 
        validatedBody: body, 
        requestId: req.requestId 
      });

      console.info('[attendance.controller.mark] received', { attendanceDate: body.attendanceDate, employeeId: body.employeeId, requestId: req.requestId });

      // Load permissions from database
      let actorPermissions = [];
      try {
        const client = await pool.connect();
        try {
          // Fetch role_id from user_role table for the user
          const userRoleResult = await client.query(
            `SELECT role_id FROM user_role WHERE user_id = $1 LIMIT 1`,
            [req.auth.userId]
          );
          
          if (userRoleResult.rows.length > 0 && userRoleResult.rows[0].role_id) {
            const roleId = userRoleResult.rows[0].role_id;
            
            // Fetch permissions for that role
            const permissionResult = await client.query(
              `SELECT p.code
               FROM role_permission rp
               JOIN permission p ON rp.permission_id = p.id
               WHERE rp.role_id = $1`,
              [roleId]
            );
            
            actorPermissions = permissionResult.rows.map(r => r.code);
          }
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('[attendance.controller.mark] failed to load permissions', { 
          error: error.message, 
          userId: req.auth.userId, 
          requestId: req.requestId 
        });
      }

      console.info('[attendance.controller.mark] loaded permissions from DB', { 
        actorPermissions, 
        userId: req.auth.userId, 
        requestId: req.requestId 
      });

      const result = await markAttendance(pool, {
        employeeId: body.employeeId,
        attendanceDate: body.attendanceDate,
        status: body.status,
        source: body.source,
        note: body.note || null,
        reason: body.reason || null,
        actorId: req.auth.userId,
        requestId: req.requestId,
        actorPermissions: actorPermissions
      });

      console.info('[attendance.controller.mark] service completed', { 
        result: !!result, 
        resultId: result?.row?.id, 
        requestId: req.requestId 
      });

      res.status(201).json(toAttendanceWriteResultDto(result.row));
    }),

    bulkMark: asyncHandler(async (req, res) => {
      const body = validate(bulkMarkAttendanceSchema, req.body);

      console.info('[attendance.bulkMark] received', { attendanceDate: body.attendanceDate, items: body.items?.length || 0, requestId: req.requestId });

      // Get permissions the same way as requirePermission middleware
      const permissions = req.user?.permissions || req.auth?.permissions || [];

      const result = await bulkMarkAttendance(pool, {
        attendanceDate: body.attendanceDate,
        source: body.source,
        items: body.items,
        actorId: req.auth.userId,
        requestId: req.requestId,
        actorPermissions: permissions
      });

      res.json(toAttendanceBulkResultDto(result));
    }),

    month: asyncHandler(async (req, res) => {
      const month = req.query.month ? String(req.query.month) : null;
      const divisionId = req.query.divisionId ? String(req.query.divisionId) : null;

      const permissions = req.authorization?.permissions || [];

      const result = await getAttendanceByMonth(pool, {
        month,
        divisionId,
        actorId: req.auth.userId,
        actorPermissions: permissions
      });

      res.json(toAttendanceMonthDto(result));
    }),

    summary: asyncHandler(async (req, res) => {
      const month = req.query.month ? String(req.query.month) : null;
      const divisionId = req.query.divisionId ? String(req.query.divisionId) : null;

      const payload = await getAttendanceSummary(pool, { month, divisionId });
      res.json(toAttendanceSummaryDto(payload));
    }),

    override: asyncHandler(async (req, res) => {
      console.info('[attendance.controller.override] received request', { 
        body: req.body, 
        userId: req.auth?.userId, 
        requestId: req.requestId,
        authKeys: req.auth ? Object.keys(req.auth) : 'no auth',
        permissions: req.auth?.permissions,
        claimsPermissions: req.auth?.claims?.permissions
      });
      
      const body = validate(overrideAttendanceSchema, req.body);
      
      console.info('[attendance.controller.override] validation passed', { 
        validatedBody: body, 
        requestId: req.requestId 
      });

      const result = await overrideAttendance(pool, {
        employeeId: body.employeeId,
        attendanceDate: body.attendanceDate,
        newStatus: body.newStatus,
        reason: body.reason,
        actorId: req.auth.userId,
        requestId: req.requestId,
        actorPermissions: req.auth.claims?.permissions || []
      });

      console.info('[attendance.controller.override] service call completed', { 
        requestId: req.requestId 
      });

      res.json(toAttendanceWriteResultDto(result));
    }),

    team: asyncHandler(async (req, res) => {
      const managerUserId = req.auth?.userId;
      const week = req.query?.week;

      if (!managerUserId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
        return res.status(400).json({ message: 'Invalid week format. Use YYYY-MM-DD' });
      }

      // Resolve manager employee id (reporting_manager_id points to employee.id)
      const managerEmpRes = await pool.query(
        'SELECT employee_id FROM "user" WHERE id = $1',
        [managerUserId]
      );
      const managerEmployeeId = managerEmpRes.rows[0]?.employee_id;

      const result = await getTeamAttendanceByWeek(pool, {
        managerId: managerEmployeeId || null,
        managerUserId,
        week,
        requestId: req.requestId
      });

      res.json(result);
    }),

    teamMonth: asyncHandler(async (req, res) => {
      const managerUserId = req.auth?.userId;
      const month = req.query?.month;

      if (!managerUserId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
      }

      // Resolve manager employee id (reporting_manager_id points to employee.id)
      const managerEmpRes = await pool.query(
        'SELECT employee_id FROM "user" WHERE id = $1',
        [managerUserId]
      );
      const managerEmployeeId = managerEmpRes.rows[0]?.employee_id;

      const result = await getTeamAttendanceByMonth(pool, {
        managerId: managerEmployeeId || null,
        managerUserId,
        month,
        requestId: req.requestId
      });

      res.json(result);
    }),
  };
}
