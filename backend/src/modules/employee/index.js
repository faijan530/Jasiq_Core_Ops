import { Router } from 'express';

import { requirePermission } from '../../shared/kernel/authorization.js';
import { employeeController } from './controller/employeeController.js';

export function employeeRoutes({ pool }) {
  const router = Router();
  const controller = employeeController({ pool });

  router.post(
    '/',
    requirePermission({
      pool,
      permissionCode: 'EMPLOYEE_WRITE',
      getDivisionId: async (req) => {
        if (req.body?.scope !== 'DIVISION') return null;
        return req.body?.primaryDivisionId || null;
      }
    }),
    controller.create
  );

  router.get(
    '/',
    requirePermission({
      pool,
      permissionCode: 'EMPLOYEE_READ',
      getDivisionId: async (req) => (req.query?.divisionId ? String(req.query.divisionId) : null)
    }),
    controller.list
  );

  router.get(
    '/:id',
    requirePermission({
      pool,
      permissionCode: 'EMPLOYEE_READ',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [req.params.id]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.getById
  );

  router.patch(
    '/:id',
    requirePermission({
      pool,
      permissionCode: 'EMPLOYEE_WRITE',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [req.params.id]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.update
  );

  router.post(
    '/:id/change-scope',
    requirePermission({
      pool,
      permissionCode: 'EMPLOYEE_WRITE',
      getDivisionId: async (req) => {
        if (req.body?.scope !== 'DIVISION') return null;
        return req.body?.primaryDivisionId || null;
      }
    }),
    controller.changeScope
  );

  router.post(
    '/:id/change-status',
    requirePermission({
      pool,
      permissionCode: 'EMPLOYEE_WRITE',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [req.params.id]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.changeStatus
  );

  router.get(
    '/:id/compensation',
    requirePermission({
      pool,
      permissionCode: 'EMPLOYEE_READ',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [req.params.id]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.listCompensation
  );

  router.post(
    '/:id/compensation',
    requirePermission({
      pool,
      permissionCode: 'EMPLOYEE_COMPENSATION_WRITE',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [req.params.id]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.addCompensation
  );

  router.get(
    '/:id/documents',
    requirePermission({
      pool,
      permissionCode: 'EMPLOYEE_READ',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [req.params.id]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.listDocuments
  );

  router.post(
    '/:id/documents',
    requirePermission({
      pool,
      permissionCode: 'EMPLOYEE_DOCUMENT_WRITE',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [req.params.id]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.uploadDocument
  );

  router.get(
    '/:id/documents/:docId/download',
    requirePermission({
      pool,
      permissionCode: 'EMPLOYEE_READ',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [req.params.id]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.downloadDocument
  );

  return router;
}
