import { Router } from 'express';

import { requirePermission } from '../../../../shared/kernel/authorization.js';
import { systemConfigController } from '../controller/systemConfigController.js';

export function systemConfigRoutes({ pool }) {
  const router = Router();
  const controller = systemConfigController({ pool });

  router.get(
    '/',
    requirePermission({ pool, permissionCode: 'GOV_SYSTEM_CONFIG_READ' }),
    controller.list
  );

  router.get(
    '/:key',
    requirePermission({ pool, permissionCode: 'GOV_SYSTEM_CONFIG_READ' }),
    controller.getByKey
  );

  router.put(
    '/:key',
    requirePermission({ pool, permissionCode: 'GOV_SYSTEM_CONFIG_WRITE' }),
    controller.upsert
  );

  return router;
}
