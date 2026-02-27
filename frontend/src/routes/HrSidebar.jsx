import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery.js';

import { useBootstrap } from '../state/bootstrap.jsx';

// Icon components for navigation items
const icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  employees: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  attendance: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'leave-balances': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  'leave-overview': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  'leave-approvals': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  'timesheet-approvals': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'month-close': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
};

export function HrSidebar({ open, setOpen }) {
  const { token, setToken } = useBootstrap();
  const { bootstrap } = useBootstrap();
  const location = useLocation();

  const userEmail = bootstrap?.user?.email || 'HR Admin';
  const permissions = bootstrap?.rbac?.permissions || [];

  const isMobile = open !== undefined; // If open prop is provided, we're in mobile mode

  const handleClose = () => {
    if (isMobile && setOpen) {
      setOpen(false);
    }
  };

  function cx(...parts) {
    return parts.filter(Boolean).join(' ');
  }

  const handleLogout = async () => {
    try {
      setToken(null);
      window.location.href = '/';
    } catch (err) {
      // ignore
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/hr/dashboard' }, // Always visible
    { id: 'month-close', label: 'Operations', header: true },
    { id: 'month-close', label: '  Inbox', path: '/hr/ops/inbox' },
    { id: 'month-close', label: '  Alerts', path: '/hr/ops/alerts' },
    { id: 'month-close', label: '  Data Quality', path: '/hr/ops/data-quality' },
    { id: 'employees', label: 'Employees', path: '/hr/employees', requiredPermission: 'EMPLOYEE_READ' },
    { id: 'attendance', label: 'Attendance', path: '/hr/attendance', requiredPermission: 'ATTENDANCE_CORRECT' },
    { id: 'timesheet-approvals', label: 'Timesheet Approvals', path: '/hr/timesheets/approvals', requiredPermission: 'TIMESHEET_APPROVAL_QUEUE_READ' },
    { 
      id: 'leave-balances', 
      label: 'Leave Balances', 
      path: '/hr/leave/balances', 
      requiredPermissions: ['LEAVE_TYPE_READ', 'LEAVE_BALANCE_GRANT'] // OR condition
    },
    { id: 'leave-approvals', label: 'Leave Approvals', path: '/hr/leave/approvals', requiredPermissions: ['LEAVE_APPROVE_L1', 'LEAVE_APPROVE_L2'] },
    { id: 'leave-overview', label: 'Leave Overview', path: '/hr/leave/overview', requiredPermission: 'LEAVE_REQUEST_READ' },
    { 
      id: 'month-close', 
      label: 'Month Close', 
      path: '/hr/month-close', 
      requiredPermissions: ['GOV_MONTH_CLOSE_READ', 'MONTH_CLOSE_MANAGE'] // OR condition
    },
    { id: 'month-close', label: 'Audit Logs', path: '/hr/audit-logs', requiredPermission: 'GOV_AUDIT_READ' }
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (!item.requiredPermission && !item.requiredPermissions) return true; // Dashboard - always visible
    if (item.requiredPermission) return permissions.includes(item.requiredPermission); // Single permission check
    if (item.requiredPermissions) return item.requiredPermissions.some(perm => permissions.includes(perm)); // OR condition
    return false;
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={handleClose} />
      )}

      {/* Mobile sidebar */}
      {isMobile && (
        <div
          className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-slate-50 to-white border-r border-slate-200/60 shadow-lg transform transition-transform z-50 lg:hidden ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-full flex flex-col">
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">HR</span>
                </div>
                <span className="font-semibold text-slate-800 text-sm">HR Admin</span>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
                aria-label="Close sidebar"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {visibleNavItems.map((item) => {
                if (item.header) {
                  return (
                    <div
                      key={`${item.id}-${item.label}`}
                      className="px-3 pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      {item.label}
                    </div>
                  );
                }
                const isActive = location.pathname === item.path || (item.path !== '/hr/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={handleClose}
                    className={({ isActive }) =>
                      cx(
                        'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200',
                        'hover:bg-slate-100/80',
                        isActive
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm border border-blue-200/50'
                          : 'text-slate-700 hover:text-slate-900'
                      )
                    }
                  >
                    <span className={cx(
                      'flex-shrink-0 transition-transform duration-200',
                      isActive ? 'scale-110 text-blue-600' : 'text-slate-500 group-hover:text-slate-700'
                    )}>
                      {icons[item.id]}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full" />
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-slate-200/60">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:z-10 lg:block">
        <div className="h-full bg-gradient-to-b from-slate-50 to-white border-r border-slate-200/60 shadow-sm flex flex-col">
          {/* Desktop Header */}
          <div className="p-6 border-b border-slate-200/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold">HR</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">HR Admin</div>
                <div className="text-xs text-slate-500">JASIQ CoreOps</div>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {visibleNavItems.map((item) => {
              if (item.header) {
                return (
                  <div
                    key={`${item.id}-${item.label}`}
                    className="px-3 pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {item.label}
                  </div>
                );
              }
              const isActive = location.pathname === item.path || (item.path !== '/hr/dashboard' && location.pathname.startsWith(item.path));
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) =>
                    cx(
                      'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200',
                      'hover:bg-slate-100/80',
                      isActive
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm border border-blue-200/50'
                        : 'text-slate-700 hover:text-slate-900'
                    )
                  }
                >
                  <span className={cx(
                    'flex-shrink-0 transition-transform duration-200',
                    isActive ? 'scale-110 text-blue-600' : 'text-slate-500 group-hover:text-slate-700'
                  )}>
                    {icons[item.id]}
                  </span>
                  <span className="truncate">{item.label}</span>
                  {isActive && (
                    <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Desktop Logout */}
          <div className="p-4 border-t border-slate-200/60">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
