import React from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { ForbiddenState } from '../../components/States.jsx';
import { LeaveOverviewPage } from '../leave/LeaveOverviewPage.jsx';

export function HrLeavePage() {
  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];

  if (!permissions.includes('LEAVE_REQUEST_READ')) {
    return <ForbiddenState />;
  }

  return <LeaveOverviewPage />;
}
