import { Router } from 'express';

import { employeeDiagnosticController } from './employeeDiagnostic.controller.js';

export function employeeDiagnosticRoutes({ pool }) {
  const router = Router();
  const controller = employeeDiagnosticController({ pool });

  router.get('/employee-diagnostic/:userId', controller.diagnoseByUserId);
  router.post('/link-employee-user', controller.linkEmployeeUser);
  router.post('/fix-employee-scope', controller.fixEmployeeScope);

  return router;
}
