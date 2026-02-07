import { Router } from 'express';

import { adminManagementController } from './adminManagement.controller.js';
import { authMiddleware } from './authMiddleware.js';
import { config } from '../kernel/config.js';
import { requireAnyPermission } from '../kernel/authorization.js';

export function adminManagementRoutes({ pool }) {
  const router = Router();
  const controller = adminManagementController({ pool });

  router.get('/bootstrap-status', controller.bootstrapStatus);

  // Public only for first-time bootstrap (enforced by controller)
  router.post('/bootstrap-signup', controller.bootstrapSignup);

  // Authenticated admin-to-admin creation
  router.post(
    '/admins',
    authMiddleware({ jwtConfig: config.jwt }),
    requireAnyPermission({ pool, permissionCodes: ['AUTH_ADMIN_MANAGE'] }),
    controller.createAdmin
  );

  return router;
}
