import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useBootstrap } from '../state/bootstrap.jsx';
import { apiFetch } from '../api/client.js';

export function AdminLayout() {
  const { bootstrap, setToken } = useBootstrap();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [employeesExpanded, setEmployeesExpanded] = useState(true);
  const [timesheetsExpanded, setTimesheetsExpanded] = useState(true);
  const location = useLocation();
  const isDivisionsRoute = String(location?.pathname || '').startsWith('/admin/divisions');
  const permissions = bootstrap?.rbac?.permissions || [];
  const roles = bootstrap?.rbac?.roles || [];
  const canCreateEmployees = permissions.includes('EMPLOYEE_WRITE');
  const canReadTimesheet = permissions.includes('TIMESHEET_READ');
  const canReadApprovals = permissions.includes('TIMESHEET_APPROVAL_QUEUE_READ');
  const isManager = roles.includes('MANAGER') || roles.includes('SUPER_ADMIN') || roles.includes('FOUNDER');
  const isEmployee = roles.includes('EMPLOYEE');

  const handleLogout = async () => {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (err) {
      // Continue with logout even if API call fails
    } finally {
      setToken(null);
      window.location.href = '/';
    }
  };

  const rawNavItems = bootstrap?.navigation?.items || [
    { id: 'divisions', label: 'Divisions', path: '/admin/divisions' },
    { id: 'projects', label: 'Projects', path: '/admin/projects' },
    { id: 'rbac', label: 'RBAC', path: '/admin/rbac' },
    { id: 'employees', label: 'Employees', path: '/admin/employees' },
    { id: 'admin-management', label: 'Admin Management', path: '/admin/admin-management' }
  ];

  // Filter out standalone Timesheets items to prevent duplication
  const navItems = rawNavItems.filter(item => 
    item.label !== 'Timesheets' && 
    item.label !== 'My Timesheet' && 
    item.label !== 'Timesheet Approvals'
  );

  const shouldShowTimesheetsDropdown = canReadTimesheet;

  const employeeDirectoryItem = { id: 'employees-directory', label: 'Employee Directory', path: '/admin/employees' };
  const addEmployeeItem = { id: 'employees-add', label: 'Add Employee', path: '/admin/employees/add' };
  const myTimesheetsItem = { id: 'timesheets-my', label: 'My Timesheets', path: '/admin/timesheet/my' };
  const teamTimesheetsItem = { id: 'timesheets-team', label: 'Team Timesheets', path: '/admin/timesheet/team' };

  if (!bootstrap) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(135deg,rgba(59,130,246,0.05)_0%,transparent_50%)]"></div>
        <div className="max-w-md w-full relative">
          <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className="relative mb-4">
                <div className="w-12 h-12 border-4 border-slate-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-slate-600 font-medium">Loading CoreOps…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isDivisionsRoute ? 'min-h-screen bg-slate-100' : 'min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50'}>
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden xl:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <div className={`fixed top-0 left-0 h-full w-72 ${isDivisionsRoute ? 'bg-slate-200 border-r border-slate-200 shadow-sm' : 'bg-white/95 backdrop-blur-sm border-r border-white/20 shadow-2xl'} transform transition-transform duration-300 ease-in-out z-50 lg:hidden xl:hidden ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {!isDivisionsRoute ? <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-purple-500/5"></div> : null}
        <div className="relative z-10 h-full flex flex-col">
          {/* Mobile header */}
          <div className={isDivisionsRoute ? 'p-6 border-b border-slate-200 bg-white' : 'p-6 border-b border-white/20'}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">JASIQ LABS</h1>
                <p className="text-sm text-slate-600">Admin Portal</p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              if (item.path === '/admin/employees') {
                return (
                  <div key={item.id} className="space-y-1">
                    {/* Parent: Employees */}
                    <button
                      type="button"
                      onClick={() => setEmployeesExpanded(!employeesExpanded)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        location.pathname.startsWith('/admin/employees')
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>Employees</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${employeesExpanded ? '' : '-rotate-90'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {/* Children */}
                    {employeesExpanded && (
                      <div className="pl-4 space-y-1">
                        <NavLink
                          to={employeeDirectoryItem.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `block px-4 py-2 text-sm rounded-lg transition-colors ${
                              isActive
                                ? 'bg-slate-100 text-slate-900 font-medium'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`
                          }
                        >
                          {employeeDirectoryItem.label}
                        </NavLink>
                        {canCreateEmployees ? (
                          <NavLink
                            to={addEmployeeItem.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              `block px-4 py-2 text-sm rounded-lg transition-colors ${
                                isActive
                                  ? 'bg-slate-100 text-slate-900 font-medium'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`
                            }
                          >
                            {addEmployeeItem.label}
                          </NavLink>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              }

              if (item.path === '/admin/employees') {
                return null; // handled above
              }

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    isDivisionsRoute
                      ? `flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                          isActive ? 'bg-white text-slate-900' : 'text-slate-700 hover:bg-white/70'
                        }`
                      : `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-slate-900'
                            : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-slate-900'
                        }`
                  }
                >
                  {item.label}
                </NavLink>
              );
            })}
            {/* Timesheets dropdown - rendered once if needed */}
            {shouldShowTimesheetsDropdown && (
              <div key="mobile-timesheets" className="space-y-1">
                {/* Parent: Timesheets */}
                <button
                  type="button"
                  onClick={() => setTimesheetsExpanded(!timesheetsExpanded)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname.startsWith('/admin/timesheet')
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>Timesheets</span>
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
                          `block px-4 py-2 text-sm rounded-lg transition-colors ${
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
                          `block px-4 py-2 text-sm rounded-lg transition-colors ${
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
            )}
          </nav>

          {/* Mobile footer */}
          <div className="p-4 border-t border-white/20">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:z-10 lg:block">
        <div className={isDivisionsRoute ? 'h-full bg-slate-200 border-r border-slate-200 shadow-sm relative overflow-hidden' : 'h-full bg-white/95 backdrop-blur-sm border-r border-white/20 shadow-xl relative overflow-hidden'}>
          {!isDivisionsRoute ? <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-purple-500/5"></div> : null}
          <div className="relative z-10 h-full flex flex-col">
            {/* Desktop header */}
            <div className={isDivisionsRoute ? 'p-6 border-b border-slate-200 bg-white' : 'p-6 border-b border-white/20'}>
              <h1 className="text-xl font-bold text-slate-900">JASIQ LABS</h1>
              <p className="text-sm text-slate-600">Admin Portal</p>
            </div>

            {/* Desktop navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                if (item.path === '/admin/employees') {
                  return (
                    <div key={item.id} className="space-y-1">
                      {/* Parent: Employees */}
                      <button
                        type="button"
                        onClick={() => setEmployeesExpanded(!employeesExpanded)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          location.pathname.startsWith('/admin/employees')
                            ? 'bg-slate-100 text-slate-900'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>Employees</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${employeesExpanded ? '' : '-rotate-90'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {/* Children */}
                      {employeesExpanded && (
                        <div className="pl-4 space-y-1">
                          <NavLink
                            to={employeeDirectoryItem.path}
                            className={({ isActive }) =>
                              `block px-4 py-2 text-sm rounded-lg transition-colors ${
                                isActive
                                  ? 'bg-slate-100 text-slate-900 font-medium'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`
                            }
                          >
                            {employeeDirectoryItem.label}
                          </NavLink>
                          {canCreateEmployees ? (
                            <NavLink
                              to={addEmployeeItem.path}
                              className={({ isActive }) =>
                                `block px-4 py-2 text-sm rounded-lg transition-colors ${
                                  isActive
                                    ? 'bg-slate-100 text-slate-900 font-medium'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`
                              }
                            >
                              {addEmployeeItem.label}
                            </NavLink>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                }

                if (item.path === '/admin/employees') {
                  return null; // handled above
                }

                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) =>
                      isDivisionsRoute
                        ? `flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                            isActive ? 'bg-white text-slate-900' : 'text-slate-700 hover:bg-white/70'
                          }`
                        : `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-slate-900'
                              : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-slate-900'
                          }`
                    }
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            {/* Timesheets dropdown - rendered once if needed */}
            {shouldShowTimesheetsDropdown && (
              <div key="desktop-timesheets" className="space-y-1">
                {/* Parent: Timesheets */}
                <button
                  type="button"
                  onClick={() => setTimesheetsExpanded(!timesheetsExpanded)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname.startsWith('/admin/timesheet')
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>Timesheets</span>
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
                          `block px-4 py-2 text-sm rounded-lg transition-colors ${
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
                          `block px-4 py-2 text-sm rounded-lg transition-colors ${
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
            )}
            </nav>

            {/* Desktop footer */}
            <div className="p-4 border-t border-white/20">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Global Header - Same for all screen sizes */}
        <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
          <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <img 
                  src="/image.png" 
                  alt="JASIQ" 
                  className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
                />
                <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
              </div>
              <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
                <span className="text-white">Admin</span>
                <span className="mx-2">·</span>
                <span className="text-amber-400">Portal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="relative z-20 pt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
