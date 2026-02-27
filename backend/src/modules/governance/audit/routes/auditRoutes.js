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

  router.get(
    '/timeline',
    requirePermission({ pool, permissionCode: 'GOV_AUDIT_READ' }),
    controller.timeline
  );

  router.post(
    '/export',
    requirePermission({ pool, permissionCode: 'GOV_AUDIT_EXPORT' }),
    controller.exportCsv
  );

  router.get(
    '/exports/download',
    requirePermission({ pool, permissionCode: 'GOV_AUDIT_EXPORT' }),
    controller.downloadExport
  );

  // Allow SYSTEM_FULL_ACCESS as well for export/download
  router.post(
    '/export',
    requirePermission({ pool, permissionCode: 'SYSTEM_FULL_ACCESS' }),
    controller.exportCsv
  );

  router.get(
    '/exports/download',
    requirePermission({ pool, permissionCode: 'SYSTEM_FULL_ACCESS' }),
    controller.downloadExport
  );

  return router;
}
