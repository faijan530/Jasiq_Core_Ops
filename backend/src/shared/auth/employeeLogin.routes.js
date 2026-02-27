import { Router } from 'express';

import { employeeLoginController } from './employeeLogin.controller.js';

export function employeeLoginRoutes({ pool }) {
  const router = Router();
  const controller = employeeLoginController({ pool });

  router.post('/login', controller.login);

  return router;
}
