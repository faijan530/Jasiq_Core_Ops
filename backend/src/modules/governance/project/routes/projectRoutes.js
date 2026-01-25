import { Router } from 'express';

import { projectController } from '../controller/projectController.js';
import { requirePermission } from '../../../../shared/kernel/authorization.js';

export function projectRoutes({ pool }) {
  const router = Router();
  const controller = projectController({ pool });

  router.get(
    '/',
    requirePermission({ pool, permissionCode: 'GOV_PROJECT_READ' }),
    controller.list
  );

  router.get(
    '/:id',
    requirePermission({
      pool,
      permissionCode: 'GOV_PROJECT_READ',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT division_id FROM project WHERE id = $1', [req.params.id]);
        return res.rows[0]?.division_id || null;
      }
    }),
    controller.getById
  );

  router.post(
    '/',
    requirePermission({
      pool,
      permissionCode: 'GOV_PROJECT_WRITE',
      getDivisionId: async (req) => req.body?.divisionId
    }),
    controller.create
  );

  router.patch(
    '/:id',
    requirePermission({
      pool,
      permissionCode: 'GOV_PROJECT_WRITE',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT division_id FROM project WHERE id = $1', [req.params.id]);
        return res.rows[0]?.division_id || null;
      }
    }),
    controller.update
  );

  return router;
}
