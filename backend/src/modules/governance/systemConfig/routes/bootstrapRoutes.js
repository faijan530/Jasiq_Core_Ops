import { Router } from 'express';

import { asyncHandler } from '../../../../shared/kernel/asyncHandler.js';
import { getUserGrants } from '../../../../shared/kernel/authorization.js';
import { getSystemConfigMap, isAttendanceEnabled, isEmployeeEnabled, isMonthCloseEnabled, isProjectsEnabled } from '../../../../shared/kernel/systemConfig.js';

function buildNavigation({ permissions, features }) {
  const items = [
    {
      id: 'divisions',
      label: 'Divisions',
      path: '/admin/divisions',
      requiredPermission: 'GOV_DIVISION_READ',
      order: 10
    },
    {
      id: 'projects',
      label: 'Projects',
      path: '/admin/projects',
      requiredPermission: 'GOV_PROJECT_READ',
      order: 20,
      featureFlag: 'PROJECTS_ENABLED'
    },
    {
      id: 'rbac',
      label: 'Roles & Permissions',
      path: '/admin/rbac',
      requiredPermission: 'GOV_RBAC_READ',
      order: 30
    },
    {
      id: 'monthClose',
      label: 'Month Close',
      path: '/admin/month-close',
      requiredPermission: 'GOV_MONTH_CLOSE_READ',
      order: 40,
      featureFlag: 'MONTH_CLOSE_ENABLED'
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      path: '/admin/audit',
      requiredPermission: 'GOV_AUDIT_READ',
      order: 50
    },
    {
      id: 'systemConfig',
      label: 'System Config',
      path: '/admin/system-config',
      requiredPermission: 'GOV_SYSTEM_CONFIG_READ',
      order: 60
    },
    {
      id: 'employees',
      label: 'Employees',
      path: '/admin/employees',
      requiredPermission: 'EMPLOYEE_READ',
      order: 70,
      featureFlag: 'EMPLOYEE_ENABLED'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      path: '/admin/attendance',
      requiredPermission: 'ATTENDANCE_READ',
      order: 80,
      featureFlag: 'ATTENDANCE_ENABLED'
    }
  ];

  const allowed = items
    .filter((it) => permissions.includes(it.requiredPermission))
    .filter((it) => {
      if (!it.featureFlag) return true;
      return Boolean(features.flags[it.featureFlag]);
    })
    .sort((a, b) => a.order - b.order)
    .map(({ order, featureFlag, ...rest }) => rest);

  return { items: allowed };
}

function buildValidationRules() {
  return {
    division: {
      codeMax: 20,
      nameMax: 100
    },
    project: {
      codeMax: 30,
      nameMax: 150
    }
  };
}

function buildUiScreens() {
  return {
    divisions: {
      id: 'divisions',
      title: 'Division Management'
    },
    projects: {
      id: 'projects',
      title: 'Project Management'
    },
    rbac: {
      id: 'rbac',
      title: 'Role & Permission Viewer'
    },
    monthClose: {
      id: 'monthClose',
      title: 'Month Close Management'
    },
    audit: {
      id: 'audit',
      title: 'Audit Log Viewer'
    },
    systemConfig: {
      id: 'systemConfig',
      title: 'System Configuration'
    },
    employees: {
      id: 'employees',
      title: 'Employee Management'
    },
    attendance: {
      id: 'attendance',
      title: 'Attendance Management'
    }
  };
}

export function bootstrapRoutes({ pool }) {
  const router = Router();

  router.get(
    '/bootstrap',
    asyncHandler(async (req, res) => {
      const userId = req.auth.userId;
      const grants = await getUserGrants(pool, userId);
      const systemConfig = await getSystemConfigMap(pool);

      const features = {
        flags: {
          PROJECTS_ENABLED: await isProjectsEnabled(pool),
          MONTH_CLOSE_ENABLED: await isMonthCloseEnabled(pool),
          EMPLOYEE_ENABLED: await isEmployeeEnabled(pool),
          ATTENDANCE_ENABLED: await isAttendanceEnabled(pool)
        }
      };

      const navigation = buildNavigation({ permissions: grants.permissions, features });

      res.setHeader('cache-control', 'private, max-age=60');

      res.json({
        user: {
          id: userId
        },
        rbac: {
          roles: grants.roles,
          permissions: grants.permissions
        },
        features,
        systemConfig,
        navigation,
        ui: {
          screens: buildUiScreens()
        },
        validation: {
          rules: buildValidationRules()
        }
      });
    })
  );

  return router;
}
