import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { requireAnyPermission, requirePermission } from '../../../shared/kernel/authorization.js';
import { config } from '../../../shared/kernel/config.js';
import { timesheetController } from './timesheet.controller.js';

export function timesheetRoutes({ pool }) {
  const router = Router();
  const controller = timesheetController({ pool });

  const approvalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false
  });

  router.get(
    '/my',
    requirePermission({
      pool,
      permissionCode: 'TIMESHEET_READ',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [req.auth?.userId]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.my
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
    '/:id',
    requirePermission({
      pool,
      permissionCode: 'TIMESHEET_READ',
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
      permissionCode: 'TIMESHEET_SUBMIT',
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
    requirePermission({
      pool,
      permissionCode: 'TIMESHEET_APPROVE_L1',
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
    requirePermission({
      pool,
      permissionCode: 'TIMESHEET_APPROVE_L1',
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
