import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiFetch, getAuthToken, setAuthToken } from '../api/client.js';

const BootstrapContext = createContext(null);

function normalizeBootstrap(payload) {
  const navigationItems = payload?.navigation?.items || [];
  const permissions = payload?.rbac?.permissions || [];
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

  const canReadTimesheet = permissions.includes('TIMESHEET_READ');
  const canReadApprovals = permissions.includes('TIMESHEET_APPROVAL_QUEUE_READ');

  const canReadLeaveRequests = permissions.includes('LEAVE_REQUEST_READ');
  const canApproveLeaveL1 = permissions.includes('LEAVE_APPROVE_L1');
  const canApproveLeaveL2 = permissions.includes('LEAVE_APPROVE_L2');
  const canReadLeaveTypes = permissions.includes('LEAVE_TYPE_READ');
  const canReadLeaveBalances = permissions.includes('LEAVE_BALANCE_READ');

  const merged = [...navigationItems];
  const existingPaths = new Set(merged.map((i) => i.path));

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

  if (leaveEnabled && canReadLeaveRequests && !existingPaths.has('/leave/my')) {
    merged.push({
      id: 'leaveMy',
      label: 'My Leave',
      path: '/leave/my',
      requiredPermission: 'LEAVE_REQUEST_READ'
    });
  }

  if (leaveEnabled && canReadLeaveRequests && (canApproveLeaveL1 || canApproveLeaveL2) && !existingPaths.has('/leave/approvals')) {
    merged.push({
      id: 'leaveApprovals',
      label: 'Leave Approvals',
      path: '/leave/approvals',
      requiredPermission: 'LEAVE_REQUEST_READ'
    });
  }

  if (leaveEnabled && canReadLeaveTypes && !existingPaths.has('/leave/types')) {
    merged.push({
      id: 'leaveTypes',
      label: 'Leave Types',
      path: '/leave/types',
      requiredPermission: 'LEAVE_TYPE_READ'
    });
  }

  if (leaveEnabled && canReadLeaveBalances && !existingPaths.has('/leave/balances')) {
    merged.push({
      id: 'leaveBalances',
      label: 'Leave Balances',
      path: '/leave/balances',
      requiredPermission: 'LEAVE_BALANCE_READ'
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

  const refresh = useCallback(async () => {
    if (!token) {
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
