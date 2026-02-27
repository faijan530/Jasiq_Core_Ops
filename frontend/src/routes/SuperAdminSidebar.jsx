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
  divisions: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  projects: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  roles: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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
  timesheets: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  'leave-overview': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  payroll: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  finance: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  reports: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v8m5-4h.01M9 13h.01M15 13h.01M12 13h.01M12 17h.01M9 9h.01M15 9h.01" />
    </svg>
  ),
  'system-config': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  'month-close': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  'audit-logs': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
};

export function SuperAdminSidebar({ open, setOpen }) {
  const { token, setToken } = useBootstrap();
  const { bootstrap } = useBootstrap();
  const location = useLocation();

  const permissions = bootstrap?.rbac?.permissions || [];
  const canViewAudit = permissions.includes('GOV_AUDIT_READ');

  const isMobile = open !== undefined; // If open prop is provided, we're in mobile mode

  const handleClose = () => {
    if (isMobile && setOpen) {
      setOpen(false);
    }
  };

  const userEmail = bootstrap?.user?.email || 'Admin';

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
    { id: 'dashboard', label: 'Dashboard', path: '/super-admin/dashboard' },
    { id: 'reports', label: 'Operations', path: '/super-admin/ops/dashboard' },
    { id: 'reports', label: '  Inbox', path: '/super-admin/ops/inbox' },
    { id: 'reports', label: '  Alerts', path: '/super-admin/ops/alerts' },
    { id: 'reports', label: '  Overrides', path: '/super-admin/ops/overrides' },
    { id: 'reports', label: '  Data Quality', path: '/super-admin/ops/data-quality' },
    { id: 'reports', label: 'Reimbursements', path: '/super-admin/reimbursements' },
    { id: 'reports', label: 'Revenue', path: '/super-admin/revenue' },
    { id: 'reports', label: 'Revenue Categories', path: '/super-admin/revenue/categories' },
    { id: 'reports', label: 'Revenue Clients', path: '/super-admin/revenue/clients' },
    { id: 'divisions', label: 'Divisions', path: '/super-admin/divisions' },
    { id: 'projects', label: 'Projects', path: '/super-admin/projects' },
    { id: 'employees', label: 'Employees', path: '/super-admin/employees' },
    { id: 'attendance', label: 'Attendance', path: '/super-admin/attendance' },
    { id: 'timesheets', label: 'Timesheets', path: '/timesheet/approvals' },
    { id: 'leave-overview', label: 'Leave Overview', path: '/super-admin/leave/overview' },
    { id: 'system-config', label: 'System Config', path: '/super-admin/system-config' },
    { id: 'month-close', label: 'Month Close', path: '/super-admin/month-close' },
    ...(canViewAudit ? [{ id: 'audit-logs', label: 'Audit Logs', path: '/super-admin/audit-logs' }] : [])
  ];

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
                  <span className="text-white font-bold text-xs">SA</span>
                </div>
                <span className="font-semibold text-slate-800 text-sm">Super Admin</span>
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
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/super-admin/dashboard' && location.pathname.startsWith(item.path));
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
                <span className="text-white font-bold">SA</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">Super Admin</div>
                <div className="text-xs text-slate-500">JASIQ CoreOps</div>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/super-admin/dashboard' && location.pathname.startsWith(item.path));
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

          {/* Desktop User Profile Section */}
          <div className="p-3 border-t border-slate-200/60 bg-gradient-to-t from-slate-50 to-transparent">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/50 shadow-sm">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-inner">
                {userEmail?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 text-sm truncate">{userEmail}</div>
                <div className="text-xs text-slate-500 truncate">Super Admin</div>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm" />
                <span className="text-xs text-slate-500 font-medium">Online</span>
              </div>
            </div>
          </div>

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
