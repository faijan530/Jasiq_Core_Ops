import { Router } from 'express';

import { refreshTokenController } from './refreshToken.controller.js';

export function refreshTokenRoutes({ pool }) {
  const router = Router();
  const controller = refreshTokenController({ pool });

  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);

  return router;
}
