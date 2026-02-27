import React from 'react';

import { useBootstrap } from '../../state/bootstrap.jsx';
import { ForbiddenState } from '../../components/States.jsx';

import { FinancePnLPage } from '../finance/reports/FinancePnLPage.jsx';

export function ManagerPnLPage() {
  const { bootstrap } = useBootstrap();
  const roles = bootstrap?.rbac?.roles || [];

  const divisionId =
    bootstrap?.user?.primaryDivisionId ||
    bootstrap?.user?.primary_division_id ||
    bootstrap?.user?.divisionId ||
    null;

  const canAccess = roles.includes('MANAGER') || roles.includes('SUPER_ADMIN');

  if (!canAccess) {
    return (
      <div className="p-6">
        <ForbiddenState error={{ message: 'Access denied' }} />
      </div>
    );
  }

  if (!divisionId) {
    return (
      <div className="p-6">
        <ForbiddenState error={{ message: 'Division scope is required for Manager reports' }} />
      </div>
    );
  }

  return <FinancePnLPage hideConsolidated hideExport forceDivisionOnly initialDivisionId={divisionId} />;
}
