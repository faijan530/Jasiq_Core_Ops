import { Router } from 'express';
import { adminLoginController } from './adminLogin.controller.js';

export function adminLoginRoutes({ pool }) {
  const router = Router();
  const controller = adminLoginController({ pool });

  router.get('/test', (req, res) => res.json({ ok: true }));
  router.post('/admin/login', controller.login);

  return router;
}
