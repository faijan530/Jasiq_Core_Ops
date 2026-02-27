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

import { employeeRoutes } from './modules/employee/index.js';
import { attendanceRoutes } from './modules/attendance/controller/attendanceRoutes.js';
import { timesheetRoutes } from './modules/timesheet/index.js';
import { leaveRoutes } from './modules/leave/index.js';
import { payrollRoutes } from './modules/payroll/index.js';
import { expenseRoutes } from './modules/expense/index.js';
import { financeRoutes } from './modules/finance/index.js';
import { incomeRoutes } from './modules/income/index.js';
import { reportingRoutes } from './modules/reporting/index.js';
import { opsRoutes } from './modules/ops/index.js';
import { reimbursementRoutes } from './modules/reimbursement/index.js';
import { employeeDiagnosticRoutes } from './modules/employee/presentation/employeeDiagnostic.routes.js';
import { adminLoginRoutes } from './shared/auth/adminLogin.routes.js';
import { adminManagementRoutes } from './shared/auth/adminManagement.routes.js';
import { passwordSetupRoutes } from './shared/auth/passwordSetup.routes.js';
import { changePasswordRoutes } from './shared/auth/changePassword.routes.js';
import { employeeLoginRoutes } from './shared/auth/employeeLogin.routes.js';

export function buildApp({ pool }) {
  const app = express();

  // Avoid 304 Not Modified responses for API JSON while developing/debugging.
  // This prevents the browser from reusing cached approval queue responses.
  app.set('etag', false);

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  if (config.nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }

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
  // Phase 0 bootstrap signup + admin management routes
  app.use('/api/v1/auth', adminManagementRoutes({ pool }));
  // Employee login routes (no auth required)
  app.use('/api/v1/auth/employee', employeeLoginRoutes({ pool }));

  // Public password setup (no auth required)
  app.use('/api/public', passwordSetupRoutes({ pool }));

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
        req.originalUrl.startsWith('/api/month-close') ||
        req.originalUrl.startsWith('/api/v1/attendance') ||
        req.originalUrl.startsWith('/api/v1/timesheets') ||
        req.originalUrl.startsWith('/api/v1/leave') ||
        req.originalUrl.startsWith('/api/v1/payroll') ||
        req.originalUrl.startsWith('/api/v1/expenses') ||
        req.originalUrl.startsWith('/api/v1/income')
    })
  );

  app.use('/api/v1/app', bootstrapRoutes({ pool }));

  app.use('/api/v1/governance/divisions', divisionRoutes({ pool }));
  app.use('/api/v1/governance/projects', projectRoutes({ pool }));
  app.use('/api/v1/governance/rbac', rbacRoutes({ pool }));
  app.use('/api/v1/governance/audit', auditRoutes({ pool }));
  app.use('/api/v1/governance/month-close', monthCloseRoutes({ pool }));
  app.use('/api/v1/governance/system-config', systemConfigRoutes({ pool }));

  app.use('/api/month-close', auth, limiter, monthCloseRoutes({ pool }));

  app.use('/api/v1/employees', limiter, employeeRoutes({ pool }));
  app.use('/api/v1/attendance', limiter, attendanceRoutes({ pool }));
  app.use('/api/v1/timesheets', limiter, timesheetRoutes({ pool }));
  app.use('/api/v1/leave', limiter, leaveRoutes({ pool }));
  app.use('/api/v1/payroll', limiter, payrollRoutes({ pool }));
  app.use('/api/v1', limiter, expenseRoutes({ pool }));
  app.use('/api/v1', limiter, incomeRoutes({ pool }));
  app.use('/api/v1/finance', limiter, financeRoutes({ pool }));
  app.use('/api/v1/reports', limiter, reportingRoutes({ pool }));
  app.use('/api/v1/ops', limiter, opsRoutes({ pool }));
  app.use('/api/v1/reimbursements', limiter, reimbursementRoutes({ pool }));
  app.use('/api/v1/auth', limiter, changePasswordRoutes({ pool }));
  app.use('/api/v1/admin', limiter, employeeDiagnosticRoutes({ pool }));

  // Temporary route to add ATTENDANCE_VIEW_TEAM permission to MANAGER role
  app.post('/api/v1/temp/add-manager-attendance-permission', async (req, res) => {
    try {
      console.log('Adding ATTENDANCE_VIEW_TEAM permission to MANAGER role...');
      
      const result = await pool.query(`
        DO $$
        DECLARE
            manager_role_id UUID;
            permission_id UUID;
            existing_count INTEGER;
        BEGIN
            -- Get MANAGER role ID
            SELECT id INTO manager_role_id FROM role WHERE name = 'MANAGER';
            
            IF manager_role_id IS NULL THEN
                RAISE EXCEPTION 'MANAGER role not found';
            END IF;
            
            -- Get ATTENDANCE_VIEW_TEAM permission ID
            SELECT id INTO permission_id FROM permission WHERE code = 'ATTENDANCE_VIEW_TEAM';
            
            IF permission_id IS NULL THEN
                RAISE EXCEPTION 'ATTENDANCE_VIEW_TEAM permission not found';
            END IF;
            
            -- Check if permission is already assigned
            SELECT COUNT(*) INTO existing_count 
            FROM role_permission 
            WHERE role_id = manager_role_id AND permission_id = permission_id;
            
            -- Add permission if not already assigned
            IF existing_count = 0 THEN
                INSERT INTO role_permission (role_id, permission_id, created_at, updated_at)
                VALUES (manager_role_id, permission_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
                
                RAISE NOTICE 'Successfully added ATTENDANCE_VIEW_TEAM permission to MANAGER role';
            ELSE
                RAISE NOTICE 'MANAGER already has ATTENDANCE_VIEW_TEAM permission';
            END IF;
        END $$;
      `);
      
      // Verify the permission was added
      const verifyResult = await pool.query(`
        SELECT r.name as role_name, p.code as permission_code
        FROM role_permission rp
        JOIN role r ON rp.role_id = r.id
        JOIN permission p ON rp.permission_id = p.id
        WHERE r.name = 'MANAGER' AND p.code = 'ATTENDANCE_VIEW_TEAM'
      `);
      
      console.log('✅ Permission added successfully!');
      console.log('Verification:', verifyResult.rows);
      
      res.json({ 
        success: true, 
        message: 'ATTENDANCE_VIEW_TEAM permission added to MANAGER role',
        verification: verifyResult.rows
      });
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  app.use(errorMiddleware);

  return app;
}
