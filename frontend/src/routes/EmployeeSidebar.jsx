import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useBootstrap } from '../state/bootstrap.jsx';

const cx = (...args) => args.filter(Boolean).join(' ');

export function EmployeeSidebar({ mobile, onClose }) {
  const { setToken } = useBootstrap();
  const location = useLocation();

  // Handle mobile close callback
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleLogout = async () => {
    try {
      setToken(null);
      window.location.href = '/';
    } catch (err) {
      // ignore
    }
  };

  const navItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      path: '/employee/dashboard', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      id: 'profile', 
      label: 'My Profile', 
      path: '/employee/profile', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    { 
      id: 'attendance', 
      label: 'My Attendance', 
      path: '/employee/attendance', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      id: 'timesheets', 
      label: 'My Timesheets', 
      path: '/employee/timesheets', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      id: 'leave', 
      label: 'My Leave', 
      path: '/employee/leave', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      )
    },
    { 
      id: 'documents', 
      label: 'Documents', 
      path: '/employee/documents', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      id: 'payslips', 
      label: 'My Payslips', 
      path: '/employee/payslips', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      id: 'expenses', 
      label: 'Expenses', 
      path: '/employee/expenses', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      id: 'reimbursements', 
      label: 'Reimbursements', 
      path: '/employee/reimbursements', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-64 bg-gradient-to-b from-blue-700 to-indigo-800 border-r border-white/10 flex flex-col shadow-2xl">
          <div className="p-8 border-b border-white/10 bg-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg transform transition-transform hover:rotate-3">
                <span className="text-blue-700 font-bold">JC</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white tracking-tight">CoreOps</div>
                <div className="text-[10px] uppercase tracking-widest text-blue-200 font-bold">Employee</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) =>
                    cx(
                      'group relative flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300',
                      isActive 
                        ? 'bg-white/20 text-white shadow-lg backdrop-blur-md border border-white/10' 
                        : 'text-blue-100 hover:text-white hover:bg-white/10'
                    )
                  }
                >
                  <span className={cx(
                    'transition-colors duration-300',
                    isActive ? 'text-white' : 'text-blue-300 group-hover:text-white'
                  )}>{item.icon}</span>
                  <span className="relative font-semibold">{item.label}</span>
                  {isActive && (
                    <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  )}
                </NavLink>
              );
            })}
            <div className="border-t border-white/10 mt-6 pt-4 space-y-1.5">
              <NavLink
                to="/employee/help"
                className={({ isActive }) =>
                  cx(
                    'group flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300',
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'text-blue-100 hover:text-white hover:bg-white/10'
                  )
                }
              >
                <svg className="w-5 h-5 text-blue-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help & Policies
              </NavLink>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-blue-100 hover:bg-rose-500/20 hover:text-rose-200 transition-all duration-300 group"
              >
                <svg className="w-5 h-5 text-blue-300 group-hover:text-rose-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile Sidebar (when mobile prop is true) */}
      {mobile && (
        <div className="h-full flex flex-col bg-gradient-to-b from-blue-700 to-indigo-800">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-blue-700 font-bold text-sm">JC</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white tracking-tight">CoreOps</div>
                  <div className="text-[10px] uppercase tracking-widest text-blue-200 font-bold">Employee</div>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={handleClose}
                  className={({ isActive }) =>
                    cx(
                      'group relative flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300',
                      isActive 
                        ? 'bg-white/20 text-white shadow-lg backdrop-blur-md border border-white/10' 
                        : 'text-blue-100 hover:text-white hover:bg-white/10'
                    )
                  }
                >
                  <span className={cx(
                    'transition-colors duration-300',
                    isActive ? 'text-white' : 'text-blue-300 group-hover:text-white'
                  )}>{item.icon}</span>
                  <span className="relative font-semibold">{item.label}</span>
                  {isActive && (
                    <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  )}
                </NavLink>
              );
            })}
            <div className="border-t border-white/10 mt-6 pt-4 space-y-1.5">
              <NavLink
                to="/employee/help"
                onClick={handleClose}
                className={({ isActive }) =>
                  cx(
                    'group flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300',
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'text-blue-100 hover:text-white hover:bg-white/10'
                  )
                }
              >
                <svg className="w-5 h-5 text-blue-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help & Policies
              </NavLink>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-blue-100 hover:bg-rose-500/20 hover:text-rose-200 transition-all duration-300 group"
              >
                <svg className="w-5 h-5 text-blue-300 group-hover:text-rose-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
