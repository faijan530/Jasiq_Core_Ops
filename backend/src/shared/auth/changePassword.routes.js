import { Router } from 'express';

import { changePasswordController } from './changePassword.controller.js';

export function changePasswordRoutes({ pool }) {
  const router = Router();
  const controller = changePasswordController({ pool });

  router.post('/change-password', controller.changePassword);

  return router;
}
