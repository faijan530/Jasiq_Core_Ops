import React from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { ForbiddenState } from '../../components/States.jsx';
import { EmployeeProfilePage } from '../employees/EmployeeProfilePage.jsx';

export function HrEmployeeViewPage() {
  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];

  if (!permissions.includes('EMPLOYEE_READ')) {
    return <ForbiddenState />;
  }

  return <EmployeeProfilePage />;
}
