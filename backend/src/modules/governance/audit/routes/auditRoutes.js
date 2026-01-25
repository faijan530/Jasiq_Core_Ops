import { Router } from 'express';

import { requirePermission } from '../../../../shared/kernel/authorization.js';
import { auditController } from '../controller/auditController.js';

export function auditRoutes({ pool }) {
  const router = Router();
  const controller = auditController({ pool });

  router.get(
    '/',
    requirePermission({ pool, permissionCode: 'GOV_AUDIT_READ' }),
    controller.list
  );

  return router;
}
