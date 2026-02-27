import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { requireAnyPermission, requirePermission } from '../../../shared/kernel/authorization.js';
import { config } from '../../../shared/kernel/config.js';
import { timesheetController } from './timesheet.controller.js';

export function timesheetRoutes({ pool }) {
  const router = Router();
  const controller = timesheetController({ pool });

  function withEmployeeIdInBodyFromAuth(handler) {
    return async function middleware(req, res, next) {
      try {
        // Find employee by user.employee_id (user table has employee_id column)
        const userResult = await pool.query(
          'SELECT employee_id FROM "user" WHERE id = $1',
          [req.auth?.userId]
        );
        
        const employeeId = userResult.rows[0]?.employee_id;
        
        // Set employeeId in body (will be null if employee not found)
        req.body = { ...(req.body || {}), employeeId: employeeId || null };
        
        return handler(req, res, next);
      } catch (error) {
        console.error('Error finding employee by user_id:', error);
        // Set employeeId to null if there's an error
        req.body = { ...(req.body || {}), employeeId: null };
        return handler(req, res, next);
      }
    };
  }

  function authorizeRoles(allowedRoles) {
    return function middleware(req, res, next) {
      const role = req.auth?.claims?.role;
      if (allowedRoles.includes(role)) {
        next();
        return;
      }
      res.status(403).json({ message: 'Forbidden' });
    };
  }

  const approvalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false
  });

  router.get(
    '/me',
    authorizeRoles(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']),
    controller.my
  );

  router.get(
    '/me/:id',
    authorizeRoles(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']),
    controller.getMyTimesheetById
  );

  router.post(
    '/me',
    authorizeRoles(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']),
    withEmployeeIdInBodyFromAuth(controller.upsertWorklog)
  );

  router.get(
    '/approvals',
    requirePermission({
      pool,
      permissionCode: 'TIMESHEET_APPROVAL_QUEUE_READ',
      getDivisionId: async (req) => (req.query?.divisionId ? String(req.query.divisionId) : null)
    }),
    controller.approvals
  );

  router.get(
    '/team',
    requirePermission({
      pool,
      permissionCode: 'TIMESHEET_APPROVE_TEAM',
      getDivisionId: async () => null
    }),
    controller.team
  );

  router.get(
    '/:id',
    requireAnyPermission({
      pool,
      permissionCodes: ['TIMESHEET_READ', 'TIMESHEET_APPROVAL_QUEUE_READ', 'TIMESHEET_APPROVE_L1', 'TIMESHEET_APPROVE_L2'],
      getDivisionId: async (req) => {
        const res = await pool.query(
          `SELECT e.primary_division_id
           FROM timesheet_header th
           JOIN employee e ON e.id = th.employee_id
           WHERE th.id = $1`,
          [req.params.id]
        );
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.getById
  );

  router.post(
    '/worklog',
    requirePermission({
      pool,
      permissionCode: 'TIMESHEET_WORKLOG_WRITE',
      getDivisionId: async (req) => {
        const employeeId = req.body?.employeeId;
        if (!employeeId) return null;
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [employeeId]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.upsertWorklog
  );

  router.post(
    '/:id/submit',
    requirePermission({
      pool,
      permissionCode: 'TIMESHEET_SUBMIT_SELF',
      getDivisionId: async (req) => {
        const res = await pool.query(
          `SELECT e.primary_division_id
           FROM timesheet_header th
           JOIN employee e ON e.id = th.employee_id
           WHERE th.id = $1`,
          [req.params.id]
        );
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.submit
  );

  router.post(
    '/:id/approve',
    approvalLimiter,
    requireAnyPermission({
      pool,
      permissionCodes: ['TIMESHEET_APPROVE_L1', 'TIMESHEET_APPROVE_L2'],
      getDivisionId: async (req) => {
        const res = await pool.query(
          `SELECT e.primary_division_id
           FROM timesheet_header th
           JOIN employee e ON e.id = th.employee_id
           WHERE th.id = $1`,
          [req.params.id]
        );
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.approve
  );

  router.post(
    '/:id/reject',
    approvalLimiter,
    requireAnyPermission({
      pool,
      permissionCodes: ['TIMESHEET_APPROVE_L1', 'TIMESHEET_APPROVE_L2'],
      getDivisionId: async (req) => {
        const res = await pool.query(
          `SELECT e.primary_division_id
           FROM timesheet_header th
           JOIN employee e ON e.id = th.employee_id
           WHERE th.id = $1`,
          [req.params.id]
        );
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.reject
  );

  router.post(
    '/:id/request-revision',
    approvalLimiter,
    requireAnyPermission({
      pool,
      permissionCodes: ['TIMESHEET_APPROVE_L1', 'TIMESHEET_APPROVE_L2'],
      getDivisionId: async (req) => {
        const res = await pool.query(
          `SELECT e.primary_division_id
           FROM timesheet_header th
           JOIN employee e ON e.id = th.employee_id
           WHERE th.id = $1`,
          [req.params.id]
        );
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.requestRevision
  );

  return router;
}
