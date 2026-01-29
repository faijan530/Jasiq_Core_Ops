import { Router } from 'express';

import { requireAnyPermission, requirePermission } from '../../../shared/kernel/authorization.js';

import { leaveTypeController } from './leaveType.controller.js';
import { leaveRequestController } from './leaveRequest.controller.js';

export function leaveRoutes({ pool }) {
  const router = Router();
  const typeController = leaveTypeController({ pool });
  const requestController = leaveRequestController({ pool });

  // Leave Types
  router.get(
    '/types',
    requirePermission({
      pool,
      permissionCode: 'LEAVE_TYPE_READ',
      getDivisionId: async () => null
    }),
    typeController.list
  );

  router.post(
    '/types',
    requirePermission({
      pool,
      permissionCode: 'LEAVE_TYPE_WRITE',
      getDivisionId: async () => null
    }),
    typeController.create
  );

  router.patch(
    '/types/:id',
    requirePermission({
      pool,
      permissionCode: 'LEAVE_TYPE_WRITE',
      getDivisionId: async () => null
    }),
    typeController.update
  );

  // Leave Balances
  router.get(
    '/balances',
    requirePermission({
      pool,
      permissionCode: 'LEAVE_BALANCE_READ',
      getDivisionId: async (req) => {
        const employeeId = req.query?.employeeId ? String(req.query.employeeId) : null;
        if (!employeeId) return null;
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [employeeId]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    requestController.listBalances
  );

  router.post(
    '/balances/grant',
    requirePermission({
      pool,
      permissionCode: 'LEAVE_BALANCE_GRANT',
      getDivisionId: async (req) => {
        const employeeId = req.body?.employeeId;
        if (!employeeId) return null;
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [employeeId]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    requestController.grantBalance
  );

  // Leave Requests
  router.get(
    '/requests',
    requirePermission({
      pool,
      permissionCode: 'LEAVE_REQUEST_READ',
      getDivisionId: async (req) => {
        if (req.query?.divisionId) return String(req.query.divisionId);
        const employeeId = req.query?.employeeId ? String(req.query.employeeId) : null;
        if (!employeeId) return null;
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [employeeId]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    requestController.listRequests
  );

  router.post(
    '/requests',
    requirePermission({
      pool,
      permissionCode: 'LEAVE_REQUEST_CREATE',
      getDivisionId: async (req) => {
        const employeeId = req.body?.employeeId;
        if (!employeeId) return null;
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [employeeId]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    requestController.createRequest
  );

  router.post(
    '/requests/:id/cancel',
    requireAnyPermission({
      pool,
      permissionCodes: ['LEAVE_REQUEST_CANCEL', 'LEAVE_REQUEST_CREATE'],
      getDivisionId: async (req) => {
        const res = await pool.query(
          `SELECT e.primary_division_id
           FROM leave_request lr
           JOIN employee e ON e.id = lr.employee_id
           WHERE lr.id = $1`,
          [req.params.id]
        );
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    requestController.cancel
  );

  router.post(
    '/requests/:id/approve',
    requireAnyPermission({
      pool,
      permissionCodes: ['LEAVE_APPROVE_L1', 'LEAVE_APPROVE_L2'],
      getDivisionId: async (req) => {
        const res = await pool.query(
          `SELECT e.primary_division_id
           FROM leave_request lr
           JOIN employee e ON e.id = lr.employee_id
           WHERE lr.id = $1`,
          [req.params.id]
        );
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    requestController.approve
  );

  router.post(
    '/requests/:id/reject',
    requireAnyPermission({
      pool,
      permissionCodes: ['LEAVE_APPROVE_L1', 'LEAVE_APPROVE_L2'],
      getDivisionId: async (req) => {
        const res = await pool.query(
          `SELECT e.primary_division_id
           FROM leave_request lr
           JOIN employee e ON e.id = lr.employee_id
           WHERE lr.id = $1`,
          [req.params.id]
        );
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    requestController.reject
  );

  // Attachments
  router.post(
    '/requests/:id/attachments',
    requirePermission({
      pool,
      permissionCode: 'LEAVE_ATTACHMENT_UPLOAD',
      getDivisionId: async (req) => {
        const res = await pool.query(
          `SELECT e.primary_division_id
           FROM leave_request lr
           JOIN employee e ON e.id = lr.employee_id
           WHERE lr.id = $1`,
          [req.params.id]
        );
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    requestController.uploadAttachment
  );

  router.get(
    '/requests/:id/attachments',
    requirePermission({
      pool,
      permissionCode: 'LEAVE_ATTACHMENT_READ',
      getDivisionId: async (req) => {
        const res = await pool.query(
          `SELECT e.primary_division_id
           FROM leave_request lr
           JOIN employee e ON e.id = lr.employee_id
           WHERE lr.id = $1`,
          [req.params.id]
        );
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    requestController.listAttachments
  );

  router.get(
    '/requests/:id/attachments/:attId/download',
    requirePermission({
      pool,
      permissionCode: 'LEAVE_ATTACHMENT_READ',
      getDivisionId: async (req) => {
        const res = await pool.query(
          `SELECT e.primary_division_id
           FROM leave_request lr
           JOIN employee e ON e.id = lr.employee_id
           WHERE lr.id = $1`,
          [req.params.id]
        );
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    requestController.downloadAttachment
  );

  return router;
}
