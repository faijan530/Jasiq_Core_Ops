import React from 'react';

import { ForbiddenState } from '../../components/States.jsx';
import { useBootstrap } from '../../state/bootstrap.jsx';

export function HrGovernancePage() {
  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];
  const canRead = permissions.includes('GOV_DIVISION_READ') || permissions.includes('LEAVE_TYPE_READ');

  if (!canRead) {
    return <ForbiddenState />;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900">Governance</h1>
      <p className="text-slate-600 mt-2">You have access to governance modules.</p>
    </div>
  );
}
