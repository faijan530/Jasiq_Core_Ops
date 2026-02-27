import { Router } from 'express';

import { passwordSetupController } from './passwordSetup.controller.js';

export function passwordSetupRoutes({ pool }) {
  const router = Router();
  const controller = passwordSetupController({ pool });

  router.get('/setup-password', controller.validateSetupToken);
  router.post('/setup-password', controller.setPassword);

  return router;
}
