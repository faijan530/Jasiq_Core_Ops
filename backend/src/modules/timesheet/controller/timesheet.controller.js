import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';
import { badRequest, notFound, unauthorized, forbidden } from '../../../shared/kernel/errors.js';

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
      // Resolve userId safely from JWT payload (supports both 'id' and 'sub' fields)
      const userId = req.user?.id || req.user?.sub;
      
      if (!userId) {
        throw unauthorized('Invalid authentication token');
      }
      
      // Get user first, then employee through user.employee_id
      const userRes = await pool.query(
        'SELECT id, employee_id FROM "user" WHERE id = $1',
        [userId]
      );
      
      if (userRes.rowCount === 0) {
        throw notFound('User not found');
      }
      
      const user = userRes.rows[0];
      
      if (!user.employee_id) {
        throw badRequest('User is not linked to an employee record');
      }
      
      // Verify employee exists
      const employeeRes = await pool.query(
        'SELECT id FROM employee WHERE id = $1',
        [user.employee_id]
      );
      
      if (employeeRes.rowCount === 0) {
        throw notFound('Employee not found');
      }
      
      const employeeId = user.employee_id;
      const payload = await getMyTimesheets(pool, { employeeId, query: req.query });
      res.json(payload);
    }),

    getById: asyncHandler(async (req, res) => {
      const payload = await getTimesheetByIdService(pool, { id: req.params.id });
      res.json(toTimesheetDto(payload));
    }),

    upsertWorklog: asyncHandler(async (req, res) => {
      const body = validate(workLogUpsertSchema, req.body);
      
      // ALWAYS resolve employeeId from authenticated user, ignore body.employeeId
      const userId = req.user?.id || req.user?.sub;
      
      if (!userId) {
        throw unauthorized('Invalid authentication token');
      }
      
      // Get user first, then employee through user.employee_id
      const userRes = await pool.query(
        'SELECT id, employee_id FROM "user" WHERE id = $1',
        [userId]
      );
      
      if (userRes.rowCount === 0) {
        throw notFound('User not found');
      }
      
      const user = userRes.rows[0];
      
      if (!user.employee_id) {
        throw badRequest('User is not linked to an employee record');
      }
      
      // Verify employee exists
      const employeeRes = await pool.query(
        'SELECT id FROM employee WHERE id = $1',
        [user.employee_id]
      );
      
      if (employeeRes.rowCount === 0) {
        throw notFound('Employee not found');
      }
      
      const employeeId = user.employee_id;
      
      const payload = await upsertWorklogService(pool, {
        employeeId: employeeId,
        workDate: body.workDate,
        task: body.task,
        hours: body.hours,
        description: body.description || null,
        projectId: body.projectId || null,
        actorId: req.user?.id || req.user?.sub,
        requestId: req.requestId
      });
      res.status(201).json(toTimesheetDto(payload));
    }),

    submit: asyncHandler(async (req, res) => {
      validate(submitTimesheetSchema, req.body);
      
      // Get the timesheet to verify ownership
      const timesheetRes = await pool.query(
        'SELECT employee_id, status FROM timesheet_header WHERE id = $1',
        [req.params.id]
      );
      
      if (timesheetRes.rowCount === 0) {
        throw notFound('Timesheet not found');
      }
      
      const timesheet = timesheetRes.rows[0];
      
      // Resolve user's employee_id
      const userId = req.user?.id || req.user?.sub;
      const userRes = await pool.query(
        'SELECT id, employee_id FROM "user" WHERE id = $1',
        [userId]
      );
      
      if (userRes.rowCount === 0) {
        throw notFound('User not found');
      }
      
      const user = userRes.rows[0];
      
      if (!user.employee_id) {
        throw badRequest('User is not linked to an employee record');
      }
      
      // Ensure user can only submit their own timesheet
      if (timesheet.employee_id !== user.employee_id) {
        throw forbidden('You can only submit your own timesheet');
      }
      
      // Check if already submitted (idempotent)
      if (timesheet.status === 'SUBMITTED') {
        // Return existing timesheet without modification
        const payload = await getTimesheetByIdService(pool, { id: req.params.id });
        res.json({ item: payload });
        return;
      }
      
      const payload = await submitTimesheet(pool, { id: req.params.id, actorId: userId, requestId: req.requestId });
      res.json({ item: payload });
    }),

    approve: asyncHandler(async (req, res) => {
      validate(submitTimesheetSchema, req.body);
      const payload = await approveTimesheet(pool, { id: req.params.id, actorId: req.user?.id || req.user?.sub, requestId: req.requestId });
      res.json({ item: payload });
    }),

    reject: asyncHandler(async (req, res) => {
      const body = validate(decisionSchema, req.body);
      const payload = await rejectTimesheet(pool, { id: req.params.id, actorId: req.user?.id || req.user?.sub, requestId: req.requestId, reason: body.reason });
      res.json({ item: payload });
    }),

    requestRevision: asyncHandler(async (req, res) => {
      const body = validate(decisionSchema, req.body);
      const payload = await requestRevision(pool, { id: req.params.id, actorId: req.user?.id || req.user?.sub, requestId: req.requestId, reason: body.reason });
      res.json({ item: payload });
    }),

    approvals: asyncHandler(async (req, res) => {
      const actorPermissions = req.authorization?.permissions || [];
      const payload = await listApprovals(pool, { query: req.query, actorPermissions });
      res.json(toApprovalsQueueDto(payload));
    }),

    getMyTimesheetById: asyncHandler(async (req, res) => {
      const timesheetId = req.params.id;
      const userId = req.user?.id || req.user?.sub;
      
      // Get user's employee ID
      const userRes = await pool.query(
        'SELECT id, employee_id FROM "user" WHERE id = $1',
        [userId]
      );
      if (userRes.rowCount === 0) throw notFound('User not found');
      const user = userRes.rows[0];
      if (!user.employee_id) throw badRequest('User is not linked to an employee record');
      
      // Get timesheet and verify ownership
      const timesheetRes = await pool.query(
        'SELECT employee_id FROM timesheet_header WHERE id = $1',
        [timesheetId]
      );
      if (timesheetRes.rowCount === 0) throw notFound('Timesheet not found');
      const timesheet = timesheetRes.rows[0];
      
      // Verify user owns this timesheet
      if (timesheet.employee_id !== user.employee_id) {
        throw forbidden('You can only access your own timesheets');
      }
      
      // Get full timesheet details
      const payload = await getTimesheetByIdService(pool, { id: timesheetId });
      res.json({ item: payload });
    }),

    team: asyncHandler(async (req, res) => {
      const managerUserId = req.auth?.userId;
      const week = req.query?.week;
      const status = String(req.query?.status || 'SUBMITTED').toUpperCase();

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
      if (!managerEmployeeId) {
        return { week, records: [] };
      }

      // Get employees reporting to this manager
      let employeesResult = await pool.query(
        `SELECT e.id, e.first_name, e.last_name, e.employee_code 
         FROM employee e 
         WHERE e.reporting_manager_id = $1 AND e.status = 'ACTIVE'`,
        [managerEmployeeId]
      );

      if ((employeesResult.rows || []).length === 0) {
        // Fallback: if reporting lines are not configured, return all ACTIVE employees
        employeesResult = await pool.query(
          `SELECT e.id, e.first_name, e.last_name, e.employee_code
           FROM employee e
           WHERE e.status = 'ACTIVE'
           ORDER BY e.first_name ASC, e.last_name ASC`
        );
      }

      const employees = employeesResult.rows;
      if (employees.length === 0) {
        return {
          week,
          records: []
        };
      }

      const employeeIds = employees.map(e => e.id);
      const employeeMap = new Map(employees.map(e => [e.id, `${e.first_name} ${e.last_name}`]));

      // Get start and end of week (Monday to Sunday)
      const weekDate = new Date(week + 'T00:00:00.000Z');
      const dayOfWeek = weekDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      // Calculate Monday (start of week)
      const startOfWeek = new Date(weekDate);
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days; otherwise go back to Monday
      startOfWeek.setDate(weekDate.getDate() - daysToMonday);
      
      // Calculate Sunday (end of week)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startDate = startOfWeek.toISOString().split('T')[0];
      const endDate = endOfWeek.toISOString().split('T')[0];

      console.log('Timesheet query debug:');
      console.log('- Input week date:', week);
      console.log('- Start of week (Monday):', startDate);
      console.log('- End of week (Sunday):', endDate);
      console.log('- Number of team employees:', employees.length);

      // Fetch timesheets for team employees in the week
      const statusParam = status === 'ALL' ? null : status;
      const timesheetResult = await pool.query(
        `SELECT th.id, th.employee_id, th.status, th.period_start, th.period_end, th.submitted_at,
                e.employee_code,
                tw.id as worklog_id, tw.work_date, tw.task, tw.hours, tw.description
         FROM timesheet_header th
         JOIN employee e ON e.id = th.employee_id
         LEFT JOIN timesheet_worklog tw ON th.id = tw.timesheet_id
         WHERE th.employee_id = ANY($1) 
         AND th.period_start <= $2 AND th.period_end >= $3
         AND ($4::text IS NULL OR th.status = $4)
         ORDER BY th.employee_id, tw.work_date
         LIMIT 1000`,
        [employeeIds, endDate, startDate, statusParam]
      );

      console.log('- Query result rows (SUBMITTED):', timesheetResult.rows.length);

      const records = [];
      const timesheetMap = new Map();

      for (const row of timesheetResult.rows) {
        if (!timesheetMap.has(row.id)) {
          timesheetMap.set(row.id, {
            id: row.id,
            employeeId: row.employee_id,
            employeeName: employeeMap.get(row.employee_id) || 'Unknown',
            employeeCode: row.employee_code,
            status: row.status,
            weekStart: row.period_start,
            weekEnd: row.period_end,
            submittedAt: row.submitted_at,
            entries: []
          });
        }

        if (row.worklog_id) {
          const timesheet = timesheetMap.get(row.id);
          timesheet.entries.push({
            id: row.worklog_id,
            date: row.work_date,
            task: row.task,
            hours: row.hours,
            description: row.description
          });
        }
      }

      const payload = {
        week,
        records: Array.from(timesheetMap.values())
      };

      res.json(payload);
      return;
    }),
  };
}
