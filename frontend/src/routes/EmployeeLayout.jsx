import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useBootstrap } from '../state/bootstrap.jsx';

export function EmployeeLayout() {
  const { bootstrap, setToken } = useBootstrap();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timesheetsExpanded, setTimesheetsExpanded] = useState(true);
  const location = useLocation();
  const permissions = bootstrap?.rbac?.permissions || [];
  const roles = bootstrap?.rbac?.roles || [];
  const canReadTimesheet = permissions.includes('TIMESHEET_READ');
  const canReadApprovals = permissions.includes('TIMESHEET_APPROVAL_QUEUE_READ');
  const isManager = roles.includes('MANAGER') || roles.includes('SUPER_ADMIN') || roles.includes('FOUNDER');

  const handleLogout = async () => {
    try {
      // Minimal logout: clear token and redirect
      setToken(null);
      window.location.href = '/';
    } catch (err) {
      // Continue with logout even if API call fails
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/employee/dashboard', icon: '🏠' },
    { id: 'profile', label: 'My Profile', path: '/employee/profile', icon: '👤' },
    { id: 'attendance', label: 'Attendance', path: '/employee/attendance', icon: '📅' },
    { id: 'leave', label: 'Leave', path: '/employee/leave', icon: '✈️' },
    { id: 'documents', label: 'Documents', path: '/employee/documents', icon: '📁' },
  ];

  const myTimesheetsItem = { id: 'timesheets-my', label: 'My Timesheets', path: '/timesheet/my' };
  const teamTimesheetsItem = { id: 'timesheets-team', label: 'Team Timesheets', path: '/timesheet/approvals' };

  if (!bootstrap) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-200 rounded-full animate-spin border-t-slate-600 mx-auto mb-2"></div>
          <p className="text-slate-600">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 shadow-lg transform transition-transform z-50 lg:hidden ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Mobile header */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-slate-900">JASIQ CoreOps™</h1>
                <p className="text-xs text-slate-600">Employee Portal</p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile navigation */}
          <nav className="flex-1 p-2">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
            {canReadTimesheet || canReadApprovals ? (
              <div className="space-y-1">
                {/* Parent: Timesheets */}
                <button
                  type="button"
                  onClick={() => setTimesheetsExpanded(!timesheetsExpanded)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname.startsWith('/timesheet')
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">📊</span>
                    Timesheets
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${timesheetsExpanded ? '' : '-rotate-90'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {/* Children */}
                {timesheetsExpanded && (
                  <div className="pl-4 space-y-1">
                    {canReadTimesheet ? (
                      <NavLink
                        to={myTimesheetsItem.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `block px-3 py-2 text-sm rounded-lg transition-colors ${
                            isActive
                              ? 'bg-slate-100 text-slate-900 font-medium'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`
                        }
                      >
                        {myTimesheetsItem.label}
                      </NavLink>
                    ) : null}
                    {canReadApprovals && isManager ? (
                      <NavLink
                        to={teamTimesheetsItem.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `block px-3 py-2 text-sm rounded-lg transition-colors ${
                            isActive
                              ? 'bg-slate-100 text-slate-900 font-medium'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`
                        }
                      >
                        {teamTimesheetsItem.label}
                      </NavLink>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
            <div className="border-t border-slate-200 mt-4 pt-2">
              <NavLink
                to="/help"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <span className="text-lg">❓</span>
                Help / Policies
              </NavLink>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="text-lg">🚪</span>
                Logout
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
          {/* Desktop header */}
          <div className="p-4 border-b border-slate-200">
            <h1 className="text-lg font-bold text-slate-900">JASIQ CoreOps™</h1>
            <p className="text-xs text-slate-600">Employee Portal</p>
          </div>

          {/* Desktop navigation */}
          <nav className="flex-1 p-2">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
            {canReadTimesheet || canReadApprovals ? (
              <div className="space-y-1">
                {/* Parent: Timesheets */}
                <button
                  type="button"
                  onClick={() => setTimesheetsExpanded(!timesheetsExpanded)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname.startsWith('/timesheet')
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">📊</span>
                    Timesheets
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${timesheetsExpanded ? '' : '-rotate-90'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {/* Children */}
                {timesheetsExpanded && (
                  <div className="pl-4 space-y-1">
                    {canReadTimesheet ? (
                      <NavLink
                        to={myTimesheetsItem.path}
                        className={({ isActive }) =>
                          `block px-3 py-2 text-sm rounded-lg transition-colors ${
                            isActive
                              ? 'bg-slate-100 text-slate-900 font-medium'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`
                        }
                      >
                        {myTimesheetsItem.label}
                      </NavLink>
                    ) : null}
                    {canReadApprovals && isManager ? (
                      <NavLink
                        to={teamTimesheetsItem.path}
                        className={({ isActive }) =>
                          `block px-3 py-2 text-sm rounded-lg transition-colors ${
                            isActive
                              ? 'bg-slate-100 text-slate-900 font-medium'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`
                        }
                      >
                        {teamTimesheetsItem.label}
                      </NavLink>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
            <div className="border-t border-slate-200 mt-4 pt-2">
              <NavLink
                to="/help"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <span className="text-lg">❓</span>
                Help / Policies
              </NavLink>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="text-lg">🚪</span>
                Logout
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-slate-900">JASIQ CoreOps™</h1>
            <div className="w-9"></div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
