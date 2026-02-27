import { Router } from 'express';

import { requirePermission as requirePermissionSimple } from '../../../shared/kernel/requirePermission.js';
import { requirePermission as requirePermissionDb } from '../../../shared/kernel/authorization.js';
import { leaveTypeController } from './leaveType.controller.js';
import { leaveRequestController } from './leaveRequest.controller.js';
import { requireAnyPermission } from '../../../shared/kernel/authorization.js';

export function leaveRoutes({ pool }) {
  const router = Router();
  const typeController = leaveTypeController({ pool });
  const requestController = leaveRequestController({ pool });

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

  function withEmployeeIdInQueryFromAuth(handler) {
    return async function middleware(req, res, next) {
      try {
        // Find employee by user.employee_id (user table has employee_id column)
        const userResult = await pool.query(
          'SELECT employee_id FROM "user" WHERE id = $1',
          [req.auth?.userId]
        );
        
        const employeeId = userResult.rows[0]?.employee_id;
        
        // Set employeeId in query (will be null if employee not found)
        req.query = { ...(req.query || {}), employeeId: employeeId || null };
        
        return handler(req, res, next);
      } catch (error) {
        console.error('Error finding employee by user_id:', error);
        // Set employeeId to null if there's an error
        req.query = { ...(req.query || {}), employeeId: null };
        return handler(req, res, next);
      }
    };
  }

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

  // Leave Types
  router.get(
    '/types',
    authorizeRoles(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']),
    typeController.list
  );

  router.get(
    '/me',
    authorizeRoles(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']),
    withEmployeeIdInQueryFromAuth(requestController.listRequests)
  );

  router.get(
    '/team',
    requirePermissionSimple('LEAVE_APPROVE_TEAM'),
    requestController.team
  );

  router.post(
    '/me',
    authorizeRoles(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']),
    requirePermissionSimple('LEAVE_APPLY_SELF'),
    withEmployeeIdInBodyFromAuth(requestController.createRequest)
  );

  router.get(
    '/balance/me',
    authorizeRoles(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']),
    withEmployeeIdInQueryFromAuth(requestController.listBalances)
  );

  router.post(
    '/types',
    requirePermissionDb({
      pool,
      permissionCode: 'LEAVE_TYPE_WRITE',
      getDivisionId: async () => null
    }),
    typeController.create
  );

  router.patch(
    '/types/:id',
    requirePermissionDb({
      pool,
      permissionCode: 'LEAVE_TYPE_WRITE',
      getDivisionId: async () => null
    }),
    typeController.update
  );

  // Leave Balances
  router.get(
    '/balances',
    requirePermissionDb({
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
    requirePermissionDb({
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
    requirePermissionDb({
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

  router.get(
    '/requests/:id',
    requirePermissionDb({
      pool,
      permissionCode: 'LEAVE_REQUEST_READ',
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
    requestController.getRequestById
  );

  router.post(
    '/requests',
    requirePermissionDb({
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
    requirePermissionSimple('LEAVE_APPLY_SELF'),
    requestController.cancel
  );

  router.post(
    '/requests/:id/approve',
    requireAnyPermission({
      pool,
      permissionCodes: ['LEAVE_APPROVE_TEAM', 'LEAVE_APPROVE_L1', 'LEAVE_APPROVE_L2'],
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
      permissionCodes: ['LEAVE_APPROVE_TEAM', 'LEAVE_APPROVE_L1', 'LEAVE_APPROVE_L2'],
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
    requirePermissionDb({
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
    requirePermissionDb({
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
    requirePermissionDb({
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
