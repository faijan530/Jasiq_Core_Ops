import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { useBootstrap } from '../state/bootstrap.jsx';
import { LoginPage } from './LoginPage.jsx';
import { AdminLoginPage } from './AdminLoginPage.jsx';
import { BootstrapSignupPage } from './BootstrapSignupPage.jsx';
import { AdminLayout } from './AdminLayout.jsx';
import { NotFoundPage } from './NotFoundPage.jsx';
import { ForbiddenState } from '../components/States.jsx';
import { LoadingState } from '../components/States.jsx';

import { DivisionsPage } from '../screens/divisions/DivisionsPage.jsx';
import { ProjectsPage } from '../screens/projects/ProjectsPage.jsx';
import { RbacPage } from '../screens/rbac/RbacPage.jsx';
import { MonthClosePage } from '../screens/monthClose/MonthClosePage.jsx';
import { AuditPage } from '../screens/audit/AuditPage.jsx';
import { SystemConfigPage } from '../screens/systemConfig/SystemConfigPage.jsx';
import { EmployeesPage } from '../screens/employees/EmployeesPage.jsx';
import { AttendancePage } from '../screens/attendance/AttendancePage.jsx';

import { MyTimesheet } from '../screens/timesheet/MyTimesheet.jsx';
import { Approvals } from '../screens/timesheet/Approvals.jsx';
import { TimesheetDetail } from '../screens/timesheet/TimesheetDetail.jsx';

import { EmployeeLeavePage } from '../screens/leave/EmployeeLeavePage.jsx';
import { ApplyLeavePage } from '../screens/leave/ApplyLeavePage.jsx';
import { LeaveRequestDetailPage } from '../screens/leave/LeaveRequestDetailPage.jsx';
import { LeaveApprovalPage } from '../screens/leave/LeaveApprovalPage.jsx';
import { LeaveTypePage } from '../screens/leave/LeaveTypePage.jsx';
import { LeaveBalancePage } from '../screens/leave/LeaveBalancePage.jsx';
import { AdminManagementPage } from '../screens/admin/AdminManagementPage.jsx';

function resolveScreenComponentByPath(path) {
  if (path === '/admin/divisions') return <DivisionsPage />;
  if (path === '/admin/projects') return <ProjectsPage />;
  if (path === '/admin/rbac') return <RbacPage />;
  if (path === '/admin/month-close') return <MonthClosePage />;
  if (path === '/admin/audit') return <AuditPage />;
  if (path === '/admin/system-config') return <SystemConfigPage />;
  if (path === '/admin/employees') return <EmployeesPage />;
  if (path === '/admin/attendance') return <AttendancePage />;
  if (path === '/admin/admin-management') return <AdminManagementPage />;
  if (path === '/timesheet/my') return <MyTimesheet />;
  if (path === '/timesheet/approvals') return <Approvals />;
  if (path === '/leave/my') return <EmployeeLeavePage />;
  if (path === '/leave/approvals') return <LeaveApprovalPage />;
  if (path === '/leave/types') return <LeaveTypePage />;
  if (path === '/leave/balances') return <LeaveBalancePage />;
  return null;
}

export function AppRouter() {
  const { status, bootstrap } = useBootstrap();

  // Show Admin Login by default; JWT paste only via explicit hash
  if (status === 'idle') {
    if (window.location.hash === '#/bootstrap-signup') {
      return <BootstrapSignupPage />;
    }
    if (window.location.hash === '#/jwt-paste') {
      return <LoginPage />;
    }
    return <AdminLoginPage />;
  }

  if (status === 'forbidden') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(135deg,rgba(59,130,246,0.05)_0%,transparent_50%)]"></div>
        
        <div className="max-w-md w-full relative">
          <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
            <div className="relative z-10">
              <ForbiddenState />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(135deg,rgba(59,130,246,0.05)_0%,transparent_50%)]"></div>
        
        <div className="max-w-md w-full relative">
          <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
            <div className="relative z-10">
              <LoadingState message="Initializing CoreOps…" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(135deg,rgba(59,130,246,0.05)_0%,transparent_50%)]"></div>
        
        <div className="max-w-md w-full relative">
          <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
            <div className="relative z-10">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Session Error</h1>
                <p className="text-slate-600 font-medium mb-4">There was a problem loading your session</p>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reload
                </button>
              </div>
            </div>
          </div>
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
        <Route path="/timesheet/:id" element={<TimesheetDetail />} />
        <Route path="/leave/apply" element={<ApplyLeavePage />} />
        <Route path="/leave/requests/:id" element={<LeaveRequestDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
