import React from 'react';
import { Navigate } from 'react-router-dom';
import { useBootstrap } from '../state/bootstrap.jsx';

export function EmployeeRedirect() {
  const { bootstrap } = useBootstrap();
  const roles = bootstrap?.rbac?.roles || [];

  // If user is EMPLOYEE, redirect to employee dashboard
  if (roles.includes('EMPLOYEE')) {
    return <Navigate to="/employee/dashboard" replace />;
  }

  // Otherwise, redirect to admin dashboard (default behavior)
  return <Navigate to="/admin" replace />;
}
