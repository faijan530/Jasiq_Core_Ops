import React from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { ForbiddenState } from '../../components/States.jsx';
import { CreateEmployeePage } from '../employees/CreateEmployeePage.jsx';

export function HrEmployeeAddPage() {
  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];

  if (!permissions.includes('EMPLOYEE_WRITE')) {
    return <ForbiddenState />;
  }

  return <CreateEmployeePage />;
}
