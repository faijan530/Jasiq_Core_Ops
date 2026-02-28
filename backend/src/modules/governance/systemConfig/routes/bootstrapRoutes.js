import { Router } from 'express';

import { asyncHandler } from '../../../../shared/kernel/asyncHandler.js';
import { getUserGrants } from '../../../../shared/kernel/authorization.js';
import { getSystemConfigMap } from '../../../../shared/kernel/systemConfig.js';

function parseFlag(systemConfig, key) {
  const raw = systemConfig?.[key]?.value ?? null;
  if (raw === null || raw === undefined) return false;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'enabled' || v === 'on';
}

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
    '/users/resolve',
    asyncHandler(async (req, res) => {
      const idsRaw = String(req.query?.ids || '').trim();
      const ids = idsRaw
        ? idsRaw
            .split(',')
            .map((s) => String(s).trim())
            .filter(Boolean)
            .slice(0, 50)
        : [];

      if (ids.length === 0) {
        res.json({ items: [] });
        return;
      }

      const r = await pool.query(
        `SELECT
           u.id AS user_id,
           u.email,
           u.employee_id,
           e.id AS employee_row_id,
           e.first_name,
           e.last_name
         FROM "user" u
         LEFT JOIN employee e ON e.id = u.employee_id
         WHERE u.id = ANY($1::uuid[]) OR u.employee_id = ANY($1::uuid[])`,
        [ids]
      );

      const requested = new Set(ids.map((x) => String(x)));
      const out = [];

      for (const row of r.rows || []) {
        const empName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || null;
        const name = empName || (row.email ? String(row.email) : null);
        const userId = row.user_id ? String(row.user_id) : null;
        const employeeId = row.employee_id ? String(row.employee_id) : null;

        if (userId && requested.has(userId)) {
          out.push({ id: userId, employeeId: employeeId || null, displayName: name });
        }
        if (employeeId && requested.has(employeeId)) {
          out.push({ id: employeeId, employeeId: employeeId || null, displayName: name });
        }
      }

      // Some modules may store employee.id directly in approval fields (without a linked user row)
      const emp = await pool.query(
        `SELECT id, first_name, last_name
         FROM employee
         WHERE id = ANY($1::uuid[])`,
        [ids]
      );

      for (const row of emp.rows || []) {
        const employeeId = row.id ? String(row.id) : null;
        if (!employeeId || !requested.has(employeeId)) continue;
        const name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || null;
        out.push({ id: employeeId, employeeId, displayName: name });
      }

      const seen = new Set();
      const items = out.filter((it) => {
        if (!it?.id) return false;
        if (seen.has(it.id)) return false;
        seen.add(it.id);
        return true;
      });

      res.setHeader('cache-control', 'private, max-age=60');
      res.json({ items });
    })
  );

  router.get(
    '/bootstrap',
    asyncHandler(async (req, res) => {
      const userId = req.auth.userId;
      const [grants, systemConfig] = await Promise.all([
        getUserGrants(pool, userId),
        getSystemConfigMap(pool)
      ]);

      const features = {
        flags: {
          PROJECTS_ENABLED: parseFlag(systemConfig, 'PROJECTS_ENABLED'),
          MONTH_CLOSE_ENABLED: parseFlag(systemConfig, 'MONTH_CLOSE_ENABLED'),
          EMPLOYEE_ENABLED: parseFlag(systemConfig, 'EMPLOYEE_ENABLED'),
          ATTENDANCE_ENABLED: parseFlag(systemConfig, 'ATTENDANCE_ENABLED')
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
