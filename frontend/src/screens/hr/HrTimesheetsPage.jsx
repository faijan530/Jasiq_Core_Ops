import React from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { ForbiddenState } from '../../components/States.jsx';

export function HrTimesheetsPage() {
  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];
  const roles = bootstrap?.rbac?.roles || [];
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  if (!isSuperAdmin && !permissions.includes('TIMESHEET_VIEW_TEAM')) {
    return <ForbiddenState />;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">HR Timesheets</h1>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-slate-600">Timesheet management functionality will be implemented here.</p>
      </div>
    </div>
  );
}
