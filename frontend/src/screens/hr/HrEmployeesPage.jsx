import React from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { ForbiddenState } from '../../components/States.jsx';
import { EmployeesPage } from '../employees/EmployeesPage.jsx';

export function HrEmployeesPage() {
  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];

  if (!permissions.includes('EMPLOYEE_READ')) {
    return <ForbiddenState />;
  }

  return <EmployeesPage />;
}
