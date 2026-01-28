import { Router } from 'express';

import { monthCloseRoutes } from './controller/monthClose.routes.js';

export function governanceRoutes({ pool }) {
  const router = Router();

  router.use('/governance', monthCloseRoutes({ pool }));

  return router;
}
