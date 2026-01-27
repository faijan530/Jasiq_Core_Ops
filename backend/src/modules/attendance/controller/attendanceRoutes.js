import { Router } from 'express';

import { requirePermission } from '../../../shared/kernel/authorization.js';
import { attendanceController } from './attendanceController.js';

export function attendanceRoutes({ pool }) {
  const router = Router();
  const controller = attendanceController({ pool });

  router.post(
    '/mark',
    requirePermission({
      pool,
      permissionCode: 'ATTENDANCE_WRITE',
      getDivisionId: async (req) => {
        const employeeId = req.body?.employeeId;
        if (!employeeId) return null;
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [employeeId]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.mark
  );

  router.post(
    '/bulk-mark',
    requirePermission({
      pool,
      permissionCode: 'ATTENDANCE_BULK_WRITE',
      getDivisionId: async (req) => {
        const employeeId = req.body?.items?.[0]?.employeeId;
        if (!employeeId) return null;
        const res = await pool.query('SELECT primary_division_id FROM employee WHERE id = $1', [employeeId]);
        return res.rows[0]?.primary_division_id || null;
      }
    }),
    controller.bulkMark
  );

  router.get(
    '/month',
    requirePermission({
      pool,
      permissionCode: 'ATTENDANCE_READ',
      getDivisionId: async (req) => (req.query?.divisionId ? String(req.query.divisionId) : null)
    }),
    controller.month
  );

  router.get('/today', requirePermission({
    pool,
    permissionCode: 'ATTENDANCE_READ',
    getDivisionId: async (req) => (req.query?.divisionId ? String(req.query.divisionId) : null)
  }), controller.today);

  router.get(
    '/summary',
    requirePermission({
      pool,
      permissionCode: 'ATTENDANCE_READ',
      getDivisionId: async (req) => (req.query?.divisionId ? String(req.query.divisionId) : null)
    }),
    controller.summary
  );

  return router;
}
