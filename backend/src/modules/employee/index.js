import { Router } from 'express';

import { requirePermission } from '../../shared/kernel/requirePermission.js';
import { employeeController } from './controller/employeeController.js';

export function employeeRoutes({ pool }) {
  const router = Router();
  const controller = employeeController({ pool });

  function withEmployeeIdFromAuth(handler) {
    return async function middleware(req, res, next) {
      try {
        const userId = req.auth?.userId;
        let employeeId = userId;

        if (userId) {
          const r = await pool.query('SELECT employee_id FROM "user" WHERE id = $1', [userId]);
          const mapped = r.rows[0]?.employee_id || null;
          if (mapped) employeeId = mapped;
        }

        req.params = { ...(req.params || {}), id: employeeId };
        return handler(req, res, next);
      } catch (err) {
        next(err);
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

  router.post(
    '/',
    requirePermission('EMPLOYEE_WRITE'),
    controller.create
  );

  router.get(
    '/',
    requirePermission('EMPLOYEE_READ'),
    controller.list
  );

  router.get(
    '/eligible-managers',
    requirePermission('EMPLOYEE_READ'),
    controller.getEligibleReportingManagers
  );

  router.get(
    '/me',
    authorizeRoles(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']),
    withEmployeeIdFromAuth(controller.getById)
  );

  router.get(
    '/me/payslips',
    authorizeRoles(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']),
    requirePermission('PAYSLIP_VIEW_SELF'),
    withEmployeeIdFromAuth(controller.listMyPayslips)
  );

  router.get(
    '/me/documents',
    authorizeRoles(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']),
    withEmployeeIdFromAuth(controller.listDocuments)
  );

  router.get(
    '/me/documents/:docId/download',
    authorizeRoles(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']),
    withEmployeeIdFromAuth(controller.downloadDocument)
  );

  router.get(
    '/:id',
    requirePermission('EMPLOYEE_READ'),
    controller.getById
  );

  router.patch(
    '/:id',
    requirePermission('EMPLOYEE_WRITE'),
    controller.update
  );

  router.post(
    '/:id/change-scope',
    requirePermission('EMPLOYEE_WRITE'),
    controller.changeScope
  );

  router.post(
    '/:id/change-status',
    requirePermission('EMPLOYEE_WRITE'),
    controller.changeStatus
  );

  router.get(
    '/:id/compensation',
    requirePermission('EMPLOYEE_READ'),
    controller.listCompensation
  );

  router.post(
    '/:id/compensation',
    requirePermission('EMPLOYEE_COMPENSATION_WRITE'),
    controller.addCompensation
  );

  router.get(
    '/:id/documents',
    requirePermission('EMPLOYEE_READ'),
    controller.listDocuments
  );

  router.post(
    '/:id/documents',
    requirePermission('EMPLOYEE_DOCUMENT_WRITE'),
    controller.uploadDocument
  );

  router.get(
    '/:id/documents/:docId/download',
    requirePermission('EMPLOYEE_READ'),
    controller.downloadDocument
  );

  return router;
}
