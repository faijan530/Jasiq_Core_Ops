import { Router } from 'express';

import { requirePermission } from '../../../shared/kernel/requirePermission.js';
import { requirePermission as requirePermissionDb } from '../../../shared/kernel/authorization.js';
import { attendanceController } from './attendanceController.js';

export function attendanceRoutes({ pool }) {
  const router = Router();
  const controller = attendanceController({ pool });

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

  router.get(
    '/me',
    authorizeRoles(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']),
    async (req, res, next) => {
      try {
        // Resolve employeeId from userId (same as in mark service)
        const userId = req.auth?.userId;
        const employeeIdResult = await pool.query(
          'SELECT employee_id FROM "user" WHERE id = $1',
          [userId]
        );
        
        if (employeeIdResult.rows.length === 0 || !employeeIdResult.rows[0].employee_id) {
          res.status(404).json({ message: 'Employee not found for user' });
          return;
        }
        
        const employeeId = employeeIdResult.rows[0].employee_id;
        
        const month = String(req.query?.month || new Date().toISOString().slice(0, 7));
        const m = month.trim();
        if (!/^\d{4}-\d{2}$/.test(m)) {
          res.status(400).json({ message: 'Invalid month' });
          return;
        }

        const [year, monthNum] = m.split('-').map(Number);

        const r = await pool.query(
          `
          SELECT
            id,
            employee_id,
            to_char(attendance_date, 'YYYY-MM-DD') AS "attendanceDate",
            status,
            source,
            note,
            marked_by,
            marked_at,
            created_at,
            updated_at,
            version
          FROM attendance_record
          WHERE employee_id = $1
            AND EXTRACT(YEAR FROM attendance_date) = $2
            AND EXTRACT(MONTH FROM attendance_date) = $3
          ORDER BY attendance_date ASC
          `,
          [employeeId, year, monthNum]
        );

        res.json({ items: r.rows });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    '/me',
    authorizeRoles(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']),
    (req, res, next) => {
      req.body = {
        ...(req.body || {}),
        attendanceDate: req.body?.date,
        status: req.body?.status,
        source: 'SELF'
      };
      return controller.mark(req, res, next);
    }
  );

  function requireAnyPermission(permissionCodes) {
    return function middleware(req, res, next) {
      // Try both req.user and req.auth for permissions
      const permissions = req.user?.permissions || req.auth?.permissions || [];

      // Super admin override
      if (permissions.includes('SYSTEM_FULL_ACCESS')) {
        console.log('Access granted via SYSTEM_FULL_ACCESS');
        return next();
      }

      // Check if user has any of the required permissions
      const hasPermission = permissionCodes.some(code => permissions.includes(code));
      
      if (!hasPermission) {
        console.log(`403: Missing any of required permissions ${permissionCodes.join(', ')}`);
        console.log('Available permissions:', permissions);
        return res.status(403).json({ 
          message: 'Forbidden',
          requiredPermissions: permissionCodes,
          availablePermissions: permissions
        });
      }

      console.log(`Access granted via permission: ${permissionCodes.find(code => permissions.includes(code))}`);
      next();
    };
  }

  router.post(
    '/mark',
    requirePermission('ATTENDANCE_WRITE'),
    controller.mark
  );

  router.post(
    '/bulk-mark',
    requireAnyPermission(['ATTENDANCE_BULK_WRITE', 'ATTENDANCE_WRITE']),
    controller.bulkMark
  );

  router.get(
    '/month',
    requirePermission('ATTENDANCE_VIEW_TEAM'),
    controller.month
  );

  router.get(
    '/team-month',
    requirePermissionDb({
      pool,
      permissionCode: 'ATTENDANCE_VIEW_TEAM',
      getDivisionId: async () => null
    }),
    controller.teamMonth
  );

  router.get(
    '/team',
    requirePermissionDb({
      pool,
      permissionCode: 'ATTENDANCE_VIEW_TEAM',
      getDivisionId: async () => null
    }),
    controller.team
  );

  // Alternative route for HR_ADMIN with ATTENDANCE_CORRECT permission
  router.get(
    '/hr-month',
    requirePermission('ATTENDANCE_CORRECT'),
    controller.month
  );

  router.get('/hr-today', requirePermission('ATTENDANCE_CORRECT'), controller.today);

  router.get('/today', requirePermission('ATTENDANCE_READ'), controller.today);

  router.get(
    '/summary',
    requirePermission('ATTENDANCE_READ'),
    controller.summary
  );

  // HR override route - separate from self-mark
  router.post(
    '/override',
    requireAnyPermission(['ATTENDANCE_CORRECT', 'ATTENDANCE_WRITE']),
    controller.override
  );

  return router;
}
