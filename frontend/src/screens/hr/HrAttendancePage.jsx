import React from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { ForbiddenState } from '../../components/States.jsx';
import { AttendancePage } from '../attendance/AttendancePage.jsx';

export function HrAttendancePage() {
  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];
  const roles = bootstrap?.rbac?.roles || [];
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  if (!isSuperAdmin && !permissions.includes('ATTENDANCE_VIEW_TEAM') && !permissions.includes('ATTENDANCE_CORRECT')) {
    return <ForbiddenState />;
  }

  return <AttendancePage />;
}
