import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useBootstrap } from '../../state/bootstrap.jsx';
import { pageRegistry, groupPagesBySection, icons } from '../../config/pageRegistry.jsx';

export function Sidebar({ open, setOpen, role }) {
  const { bootstrap, token, setToken } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];
  const location = useLocation();

  const handleLogout = () => {
    try {
      setToken(null);
      window.location.href = '/';
    } catch (err) {
      // ignore
    }
  };

  // Filter pages based on permissions and role
  const visiblePages = pageRegistry.filter(page => {
    // For now, show all Manager pages to fix the missing pages issue
    if (bootstrap?.rbac?.role === 'MANAGER' || role === 'Manager') {
      console.log('Manager role detected, showing all Manager pages:', page.label);
      return true;
    }
    
    const hasPermission = !page.permission || permissions.includes(page.permission);
    console.log('Page:', page.label, 'Permission:', page.permission, 'Has Permission:', hasPermission, 'User Permissions:', permissions);
    return hasPermission;
  });

  // Group pages by section
  const groupedPages = groupPagesBySection(visiblePages);

  function cx(...parts) {
    return parts.filter(Boolean).join(' ');
  }

  const isMobile = open !== undefined; // If open prop is provided, we're in mobile mode

  const handleClose = () => {
    if (isMobile && setOpen) {
      setOpen(false);
    }
  };

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
                  <span className="text-white font-bold text-xs">MG</span>
                </div>
                <span className="font-semibold text-slate-800 text-sm">Manager</span>
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
              {Object.entries(groupedPages).map(([section, pages]) => (
                <div key={section} className="mb-6">
                  <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {section}
                  </h3>
                  <div className="space-y-1">
                    {pages.map((page) => {
                      const isActive = location.pathname === page.path || 
                        (page.path !== '/manager/dashboard' && location.pathname.startsWith(page.path));
                      return (
                        <NavLink
                          key={page.path}
                          to={page.path}
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
                            isActive ? 'scale-110' : 'group-hover:scale-105'
                          )}>
                            {icons[page.icon]}
                          </span>
                          <span className="truncate">{page.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
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
                <span className="text-white font-bold">MG</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">Manager</div>
                <div className="text-xs text-slate-500">JASIQ CoreOps</div>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {Object.entries(groupedPages).map(([section, pages]) => (
              <div key={section} className="mb-6">
                <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {section}
                </h3>
                <div className="space-y-1">
                  {pages.map((page) => {
                    const isActive = location.pathname === page.path || 
                      (page.path !== '/manager/dashboard' && location.pathname.startsWith(page.path));
                    return (
                      <NavLink
                        key={page.path}
                        to={page.path}
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
                          isActive ? 'scale-110' : 'group-hover:scale-105'
                        )}>
                          {icons[page.icon]}
                        </span>
                        <span className="truncate">{page.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
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
