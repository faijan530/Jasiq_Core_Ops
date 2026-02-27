import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useBootstrap } from '../state/bootstrap.jsx';

const icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
  ledger: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  reports: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4V7m-9 10V7a2 2 0 012-2h6a2 2 0 012 2v10m-10 0h10" />
    </svg>
  ),
  expenses: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'month-close': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
};

export function FinanceSidebar({ open, setOpen }) {
  const { setToken } = useBootstrap();
  const { bootstrap } = useBootstrap();
  const location = useLocation();

  const permissions = bootstrap?.rbac?.permissions || [];
  const canViewAudit = permissions.includes('GOV_AUDIT_READ');

  const isMobile = open !== undefined;

  const handleClose = () => {
    if (isMobile && setOpen) {
      setOpen(false);
    }
  };

  const userEmail = bootstrap?.user?.email || 'Finance';

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
    { id: 'dashboard', label: 'Dashboard', path: '/finance/dashboard' },
    { id: 'reports', label: 'Operations', path: '/finance/ops/dashboard' },
    { id: 'reports', label: '  Inbox', path: '/finance/ops/inbox' },
    { id: 'reports', label: '  Alerts', path: '/finance/ops/alerts' },
    { id: 'reports', label: '  Overrides', path: '/finance/ops/overrides' },
    { id: 'reports', label: '  Data Quality', path: '/finance/ops/data-quality' },
    { id: 'payroll', label: 'Payroll', path: '/finance/payroll' },
    { id: 'ledger', label: 'Ledger', path: '/finance/ledger' },
    { id: 'expenses', label: 'Reimbursements', path: '/finance/reimbursements' },
    { id: 'expenses', label: 'Expenses', path: '/finance/expenses' },
    { id: 'expenses', label: 'Expense Categories', path: '/finance/expenses/categories' },
    { id: 'expenses', label: 'Expense Payments', path: '/finance/expenses/payments' },
    { id: 'expenses', label: 'Adjustments', path: '/finance/expenses/adjustments' },
    { id: 'reports', label: 'Revenue', path: '/finance/revenue' },
    { id: 'reports', label: 'Revenue Approvals', path: '/finance/revenue/approvals' },
    { id: 'reports', label: 'Revenue Reports', path: '/finance/revenue/reports' },
    { id: 'reports', label: 'Revenue Categories', path: '/finance/revenue/categories' },
    { id: 'reports', label: 'Revenue Clients', path: '/finance/revenue/clients' },
    { id: 'reports', label: 'Reports', path: '/finance/reports/dashboard' },
    { id: 'reports', label: '  Revenue', path: '/finance/reports/revenue' },
    { id: 'reports', label: '  Expense', path: '/finance/reports/expense' },
    { id: 'reports', label: '  Profit & Loss', path: '/finance/reports/pnl' },
    { id: 'reports', label: '  Receivables', path: '/finance/reports/receivables' },
    { id: 'reports', label: '  Payables', path: '/finance/reports/payables' },
    { id: 'reports', label: '  Cashflow', path: '/finance/reports/cashflow' },
    { id: 'month-close', label: 'Month Close', path: '/finance/month-close' },
    ...(canViewAudit ? [{ id: 'reports', label: 'Audit Logs', path: '/finance/audit-logs' }] : [])
  ];

  return (
    <>
      {isMobile && open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={handleClose} />
      )}

      {isMobile && (
        <div
          className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-slate-50 to-white border-r border-slate-200/60 shadow-lg transform transition-transform z-50 lg:hidden ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">FA</span>
                </div>
                <span className="font-semibold text-slate-800 text-sm">Finance</span>
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

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/finance/dashboard' && location.pathname.startsWith(item.path));

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
                    <span
                      className={cx(
                        'flex-shrink-0 transition-transform duration-200',
                        isActive ? 'scale-110 text-blue-600' : 'text-slate-500 group-hover:text-slate-700'
                      )}
                    >
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

      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:z-10 lg:block">
        <div className="h-full bg-gradient-to-b from-slate-50 to-white border-r border-slate-200/60 shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-200/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold">FA</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">Finance</div>
                <div className="text-xs text-slate-500">JASIQ CoreOps</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/finance/dashboard' && location.pathname.startsWith(item.path));

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
                  <span
                    className={cx(
                      'flex-shrink-0 transition-transform duration-200',
                      isActive ? 'scale-110 text-blue-600' : 'text-slate-500 group-hover:text-slate-700'
                    )}
                  >
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

          <div className="p-3 border-t border-slate-200/60 bg-gradient-to-t from-slate-50 to-transparent">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/50 shadow-sm">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-inner">
                {userEmail?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 text-sm truncate">{userEmail}</div>
                <div className="text-xs text-slate-500 truncate">Finance</div>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm" />
                <span className="text-xs text-slate-500 font-medium">Online</span>
              </div>
            </div>
          </div>

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
