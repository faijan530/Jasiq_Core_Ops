import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { requestIdMiddleware } from './shared/kernel/requestId.js';
import { errorMiddleware } from './shared/kernel/errorMiddleware.js';
import { config } from './shared/kernel/config.js';
import { authMiddleware } from './shared/auth/authMiddleware.js';
import { requestLogMiddleware } from './shared/auth/requestLogMiddleware.js';
import { monthCloseEnforcementMiddleware } from './shared/kernel/monthCloseEnforcement.js';
import { isMonthCloseEnabled } from './shared/kernel/systemConfig.js';

import { divisionRoutes } from './modules/governance/division/routes/divisionRoutes.js';
import { projectRoutes } from './modules/governance/project/routes/projectRoutes.js';
import { rbacRoutes } from './modules/governance/rbac/routes/rbacRoutes.js';
import { auditRoutes } from './modules/governance/audit/routes/auditRoutes.js';
import { monthCloseRoutes } from './modules/governance/monthClose/routes/monthCloseRoutes.js';
import { systemConfigRoutes } from './modules/governance/systemConfig/routes/systemConfigRoutes.js';
import { bootstrapRoutes } from './modules/governance/systemConfig/routes/bootstrapRoutes.js';
import { governanceRoutes } from './modules/governance/index.js';

import { employeeRoutes } from './modules/employee/index.js';
import { attendanceRoutes } from './modules/attendance/controller/attendanceRoutes.js';
import { timesheetRoutes } from './modules/timesheet/index.js';
import { leaveRoutes } from './modules/leave/index.js';
import { adminLoginRoutes } from './shared/auth/adminLogin.routes.js';

export function buildApp({ pool }) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin.split(','), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestIdMiddleware);
  app.use(requestLogMiddleware);

  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Admin login routes (no auth required)
  app.use('/api/v1/auth', adminLoginRoutes({ pool }));

  const auth = authMiddleware({ jwtConfig: config.jwt });

  app.use('/api/v1', auth);

  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false
  });

  app.use('/api/v1/governance', limiter);

  app.use(
    '/api/v1',
    monthCloseEnforcementMiddleware({
      pool,
      isEnabledFn: isMonthCloseEnabled,
      isExemptPathFn: (req) =>
        req.originalUrl.startsWith('/api/v1/governance/month-close') ||
        req.originalUrl.startsWith('/api/v1/attendance') ||
        req.originalUrl.startsWith('/api/v1/timesheets') ||
        req.originalUrl.startsWith('/api/v1/leave')
    })
  );

  app.use('/api/v1/app', bootstrapRoutes({ pool }));

  app.use('/api/v1', governanceRoutes({ pool }));

  app.use('/api/v1/governance/divisions', divisionRoutes({ pool }));
  app.use('/api/v1/governance/projects', projectRoutes({ pool }));
  app.use('/api/v1/governance/rbac', rbacRoutes({ pool }));
  app.use('/api/v1/governance/audit', auditRoutes({ pool }));
  app.use('/api/v1/governance/month-close', monthCloseRoutes({ pool }));
  app.use('/api/v1/governance/system-config', systemConfigRoutes({ pool }));

  app.use('/api/v1/employees', employeeRoutes({ pool }));
  app.use('/api/v1/attendance', attendanceRoutes({ pool }));
  app.use('/api/v1/timesheets', timesheetRoutes({ pool }));
  app.use('/api/v1/leave', leaveRoutes({ pool }));

  app.use(errorMiddleware);

  return app;
}
