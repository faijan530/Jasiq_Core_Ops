import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { useBootstrap } from '../state/bootstrap.jsx';
import { LoginPage } from './LoginPage.jsx';
import { AdminLayout } from './AdminLayout.jsx';
import { NotFoundPage } from './NotFoundPage.jsx';

import { DivisionsPage } from '../screens/divisions/DivisionsPage.jsx';
import { ProjectsPage } from '../screens/projects/ProjectsPage.jsx';
import { RbacPage } from '../screens/rbac/RbacPage.jsx';
import { MonthClosePage } from '../screens/monthClose/MonthClosePage.jsx';
import { AuditPage } from '../screens/audit/AuditPage.jsx';
import { SystemConfigPage } from '../screens/systemConfig/SystemConfigPage.jsx';
import { EmployeesPage } from '../screens/employees/EmployeesPage.jsx';
import { AttendancePage } from '../screens/attendance/AttendancePage.jsx';

function resolveScreenComponentByPath(path) {
  if (path === '/admin/divisions') return <DivisionsPage />;
  if (path === '/admin/projects') return <ProjectsPage />;
  if (path === '/admin/rbac') return <RbacPage />;
  if (path === '/admin/month-close') return <MonthClosePage />;
  if (path === '/admin/audit') return <AuditPage />;
  if (path === '/admin/system-config') return <SystemConfigPage />;
  if (path === '/admin/employees') return <EmployeesPage />;
  if (path === '/admin/attendance') return <AttendancePage />;
  return null;
}

export function AppRouter() {
  const { status, bootstrap } = useBootstrap();

  if (status === 'idle') {
    return <LoginPage />;
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading…</div>;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6">
          <div className="text-lg font-semibold text-slate-900">Bootstrap failed</div>
          <div className="mt-2 text-sm text-slate-600">Check your token and backend connectivity.</div>
        </div>
      </div>
    );
  }

  const navItems = bootstrap?.navigation?.items || [];
  const defaultPath = navItems[0]?.path || '/admin/divisions';

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to={defaultPath} replace />} />
        {navItems.map((item) => {
          const element = resolveScreenComponentByPath(item.path);
          if (!element) return null;
          return <Route key={item.id} path={item.path} element={element} />;
        })}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
