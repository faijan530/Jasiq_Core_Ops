import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery.js';

import { EmployeeSidebar } from './EmployeeSidebar.jsx';

// Page title mapping for employee
const getPageTitle = (pathname) => {
  const titleMap = {
    '/employee/dashboard': 'Dashboard',
    '/employee/timesheets': 'My Timesheets',
    '/employee/attendance': 'My Attendance',
    '/employee/leave': 'Leave Management',
    '/employee/profile': 'My Profile',
    '/employee/payroll': 'My Payroll',
    '/employee/notifications': 'Notifications',
    '/employee/payslips': 'My Payslips',
    '/employee/expenses': 'My Expenses',
    '/employee/expenses/create': 'Create Expense'
  };
  
  // Check for exact matches first
  if (titleMap[pathname]) return titleMap[pathname];
  
  // Check for dynamic routes
  if (pathname.startsWith('/employee/timesheets/')) return 'Timesheet Details';
  if (pathname.startsWith('/employee/leave/')) return 'Leave Details';
  if (pathname.startsWith('/employee/expenses/')) return 'Expense Detail';
  
  return 'Employee Portal';
};

const getPageIcon = (pathname) => {
  if (pathname.startsWith('/employee/dashboard')) return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
  if (pathname.startsWith('/employee/timesheets')) return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
  if (pathname.startsWith('/employee/attendance')) return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  if (pathname.startsWith('/employee/leave')) return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  if (pathname.startsWith('/employee/profile')) return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
  if (pathname.startsWith('/employee/payroll')) return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
};

export function EmployeeLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  
  const pageTitle = getPageTitle(location.pathname);
  const pageIcon = getPageIcon(location.pathname);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:bg-white lg:border-r lg:border-slate-200">
        <EmployeeSidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/40 z-40 lg:hidden" 
            onClick={handleSidebarClose}
          />
          {/* Mobile Sidebar */}
          <div className="fixed left-0 top-0 h-full w-64 bg-white transform transition-transform duration-300 ease-in-out z-50 lg:hidden">
            <EmployeeSidebar mobile onClose={handleSidebarClose} />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 lg:ml-64 min-w-0">
        {/* Sticky Header - Fixed positioning */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white shadow-xl border-b border-blue-700/50 backdrop-blur-md lg:left-64">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Left: Mobile menu + Page title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Mobile menu button */}
              <button
                onClick={handleSidebarToggle}
                className="lg:hidden p-2.5 rounded-xl hover:bg-white/10 transition-all duration-200 active:scale-95 shadow-md hover:shadow-lg"
                aria-label="Open menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Page title with icon */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm flex-shrink-0 shadow-inner">
                  {pageIcon}
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold tracking-tight text-white truncate">{pageTitle}</h1>
                  {!isMobile && (
                    <p className="text-xs text-blue-100 mt-0.5 font-medium">Employee Portal</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right: Brand/Logo - Enhanced for all screen sizes */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Tablet: Compact logo */}
              {isTablet && (
                <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm">
                  <div className="w-8 h-8 bg-gradient-to-br from-white to-blue-100 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-blue-700 font-bold text-sm">JC</span>
                  </div>
                  <span className="text-sm font-semibold text-white">CoreOps</span>
                </div>
              )}
              {/* Desktop: Full logo with details */}
              {!isMobile && !isTablet && (
                <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <div className="w-9 h-9 bg-gradient-to-br from-white to-blue-100 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-blue-700 font-bold">JC</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">JASIQ CoreOps</div>
                    <div className="text-xs text-blue-100 font-medium">Employee Portal</div>
                  </div>
                </div>
              )}
              {/* Mobile: Minimal logo */}
              {isMobile && !isTablet && (
                <div className="w-10 h-10 bg-gradient-to-br from-white to-blue-100 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-blue-700 font-bold text-sm">JC</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16">
          <div className="w-full px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
