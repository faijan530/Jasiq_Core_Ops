import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiFetch, getAuthToken, setAuthToken } from '../api/client.js';

const BootstrapContext = createContext(null);

function normalizeBootstrap(payload) {
  const navigationItems = payload?.navigation?.items || [];
  const permissions = payload?.rbac?.permissions || [];
  const roles = payload?.rbac?.roles || [];
  const userRole = roles[0]; // Get primary role
  const systemConfig = payload?.systemConfig || {};

  const enabledRaw = systemConfig?.TIMESHEET_ENABLED?.value ?? systemConfig?.TIMESHEET_ENABLED;
  const enabled = String(enabledRaw ?? '').trim().toLowerCase();
  const timesheetEnabled = enabled === 'true' || enabled === '1' || enabled === 'yes' || enabled === 'enabled' || enabled === 'on';

  const leaveEnabledRaw = systemConfig?.LEAVE_ENABLED?.value ?? systemConfig?.LEAVE_ENABLED;
  const leaveEnabledStr = String(leaveEnabledRaw ?? '').trim().toLowerCase();
  const leaveEnabled =
    leaveEnabledStr === 'true' ||
    leaveEnabledStr === '1' ||
    leaveEnabledStr === 'yes' ||
    leaveEnabledStr === 'enabled' ||
    leaveEnabledStr === 'on';

  const canReadTimesheet = permissions.includes('SYSTEM_FULL_ACCESS') || permissions.includes('TIMESHEET_READ');
  const canReadApprovals = permissions.includes('SYSTEM_FULL_ACCESS') || permissions.includes('TIMESHEET_APPROVAL_QUEUE_READ');

  const canReadLeaveRequests = permissions.includes('SYSTEM_FULL_ACCESS') || permissions.includes('LEAVE_REQUEST_READ');
  const canApproveLeaveL1 = permissions.includes('SYSTEM_FULL_ACCESS') || permissions.includes('LEAVE_APPROVE_L1');
  const canApproveLeaveL2 = permissions.includes('SYSTEM_FULL_ACCESS') || permissions.includes('LEAVE_APPROVE_L2');
  const canReadLeaveTypes = permissions.includes('SYSTEM_FULL_ACCESS') || permissions.includes('LEAVE_TYPE_READ');
  const canReadLeaveBalances = permissions.includes('SYSTEM_FULL_ACCESS') || permissions.includes('LEAVE_BALANCE_READ');

  const canManageAdmins = permissions.includes('SYSTEM_FULL_ACCESS') || permissions.includes('AUTH_ADMIN_MANAGE');

  const merged = [...navigationItems];
  const existingPaths = new Set(merged.map((i) => i.path));

  // Role-based Leave menu configuration
  const leaveMenuByRole = {
    SUPER_ADMIN: [
      { label: "Overview", path: "/leave/overview" }
    ],
    FOUNDER: [
      { label: "Overview", path: "/leave/overview" }
    ],
    HR_ADMIN: [
      { label: "Overview", path: "/leave/overview" }
    ],
    FINANCE_ADMIN: [
      { label: "Overview", path: "/leave/overview" }
    ],
    MANAGER: [
      { label: "Team", path: "/leave/team" }
    ],
    EMPLOYEE: [
      { label: "My Leave", path: "/leave/my" }
    ]
  };

  // Add role-based Leave menu items
  if (leaveEnabled && userRole && leaveMenuByRole[userRole]) {
    leaveMenuByRole[userRole].forEach((item, index) => {
      const itemId = `leave${userRole}${index}`;
      if (!existingPaths.has(item.path)) {
        merged.push({
          id: itemId,
          label: item.label,
          path: item.path,
          requiredPermission: 'LEAVE_REQUEST_READ' // Basic permission check
        });
        existingPaths.add(item.path);
      }
    });
  }

  if (timesheetEnabled && canReadTimesheet && !existingPaths.has('/timesheet/my')) {
    merged.push({
      id: 'timesheetMy',
      label: 'My Timesheet',
      path: '/timesheet/my',
      requiredPermission: 'TIMESHEET_READ'
    });
  }

  if (timesheetEnabled && canReadTimesheet && canReadApprovals && !existingPaths.has('/timesheet/approvals')) {
    merged.push({
      id: 'timesheetApprovals',
      label: 'Timesheet Approvals',
      path: '/timesheet/approvals',
      requiredPermission: 'TIMESHEET_APPROVAL_QUEUE_READ'
    });
  }

  // Remove old static Leave menu items - now handled by role-based configuration above

  if (canManageAdmins && !existingPaths.has('/super-admin/system-config')) {
    merged.push({
      id: 'adminManagement',
      label: 'Admin Management',
      path: '/super-admin/system-config',
      requiredPermission: 'AUTH_ADMIN_MANAGE'
    });
  }

  const byPath = {};
  for (const item of merged) {
    byPath[item.path] = item;
  }

  return {
    ...payload,
    navigation: {
      items: merged,
      byPath
    }
  };
}

export function BootstrapProvider({ children }) {
  const [status, setStatus] = useState('idle');
  const [bootstrap, setBootstrap] = useState(null);
  const [error, setError] = useState(null);

  const [token, setTokenState] = useState(getAuthToken());

  const refresh = useCallback(async (overrideToken = null) => {
    const currentToken = overrideToken !== null ? overrideToken : token;
    if (!currentToken) {
      setBootstrap(null);
      setStatus('idle');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const payload = await apiFetch('/api/v1/app/bootstrap');
      setBootstrap(normalizeBootstrap(payload));
      setStatus('ready');
    } catch (err) {
      if (err.status === 401) {
        setAuthToken(null);
        setTokenState(null);
        setBootstrap(null);
        setStatus('idle');
        return;
      }

      setError(err);
      setStatus('error');
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setToken = useCallback((next) => {
    setAuthToken(next);
    setTokenState(next || null);
    if (!next) {
      // Clear bootstrap immediately when token is cleared
      setBootstrap(null);
      setStatus('idle');
    }
  }, []);

  const value = useMemo(
    () => ({
      status,
      bootstrap,
      error,
      refresh,
      setToken,
      token
    }),
    [status, bootstrap, error, refresh, setToken, token]
  );

  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}

export function useBootstrap() {
  const ctx = useContext(BootstrapContext);
  if (!ctx) throw new Error('BootstrapProvider missing');
  return ctx;
}
