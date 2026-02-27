import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery.js';

import { HrSidebar } from './HrSidebar.jsx';

// Page title mapping
const getPageTitle = (pathname) => {
  const titleMap = {
    '/hr/dashboard': 'Dashboard',
    '/hr/employees': 'Employees',
    '/hr/employees/create': 'Create Employee',
    '/hr/attendance': 'Attendance',
    '/hr/timesheets/approvals': 'Timesheet Approvals',
    '/hr/leave/balances': 'Leave Balances',
    '/hr/leave/approvals': 'Leave Approvals',
    '/hr/leave/overview': 'Leave Overview',
    '/hr/month-close': 'Month Close'
  };
  
  // Check for exact matches first
  if (titleMap[pathname]) return titleMap[pathname];
  
  // Check for dynamic routes
  if (pathname.startsWith('/hr/employees/')) return 'Employee Profile';
  
  return 'HR';
};

const getPageIcon = (pathname) => {
  if (pathname.startsWith('/hr/dashboard')) return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
  if (pathname.startsWith('/hr/employees')) return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
  if (pathname.startsWith('/hr/attendance')) return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  if (pathname.startsWith('/hr/leave')) return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
};

export function HrLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  
  const pageTitle = getPageTitle(location.pathname);
  const pageIcon = getPageIcon(location.pathname);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Desktop Sidebar - Fixed */}
      <aside className="w-64 bg-white border-r hidden lg:flex flex-col">
        <HrSidebar />
      </aside>

      {/* Mobile Sidebar - Using HrSidebar component */}
      <HrSidebar 
        open={mobileMenuOpen} 
        setOpen={setMobileMenuOpen} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg border-b border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Left: Mobile menu + Page title */}
            <div className="flex items-center gap-3 flex-1">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2.5 rounded-xl hover:bg-white/10 transition-all duration-200 active:scale-95"
                aria-label="Open menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Page title with icon */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                  {pageIcon}
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-white">{pageTitle}</h1>
                  {!isMobile && (
                    <p className="text-xs text-slate-300 mt-0.5">JASIQ CoreOps Platform</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right: Brand/Logo */}
            <div className="flex items-center gap-4">
              {isTablet && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">JC</span>
                  </div>
                  <span className="text-sm font-semibold text-white">CoreOps</span>
                </div>
              )}
              {!isMobile && !isTablet && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold">JC</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">JASIQ CoreOps</div>
                    <div className="text-xs text-slate-300">HR Panel</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-50">
          <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
