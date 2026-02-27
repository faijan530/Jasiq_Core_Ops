import React, { useState } from 'react';

import { Outlet, useLocation } from 'react-router-dom';

import { useMediaQuery } from '../hooks/useMediaQuery.js';

import { FinanceSidebar } from './FinanceSidebar.jsx';

const getPageTitle = (pathname) => {
  const titleMap = {
    '/finance/dashboard': 'Dashboard',
    '/finance/payroll': 'Payroll',
    '/finance/ledger': 'Ledger',
    '/finance/expenses': 'Expenses',
    '/finance/expenses/create': 'Create Expense',
    '/finance/expenses/categories': 'Expense Categories',
    '/finance/expenses/payments': 'Expense Payments',
    '/finance/expenses/adjustments': 'Adjustments',
    '/finance/revenue': 'Revenue',
    '/finance/revenue/create': 'Create Income',
    '/finance/revenue/approvals': 'Revenue Approvals',
    '/finance/revenue/reports': 'Revenue Reports',
    '/finance/revenue/categories': 'Revenue Categories',
    '/finance/revenue/clients': 'Revenue Clients',
    '/finance/reports': 'Reports',
    '/finance/reports/dashboard': 'Reports Dashboard',
    '/finance/reports/revenue': 'Revenue Report',
    '/finance/reports/expense': 'Expense Report',
    '/finance/reports/pnl': 'Profit & Loss',
    '/finance/reports/receivables': 'Receivables',
    '/finance/reports/payables': 'Payables',
    '/finance/reports/cashflow': 'Cashflow',
    '/finance/month-close': 'Month Close'
  };

  if (titleMap[pathname]) return titleMap[pathname];

  if (pathname.startsWith('/finance/payroll/')) return 'Payroll Run';
  if (pathname.startsWith('/finance/expenses/')) return 'Expense Detail';
  if (pathname.startsWith('/finance/revenue/')) return 'Income Detail';
  return 'Finance';
};

const getPageIcon = (pathname) => {
  if (pathname.startsWith('/finance/dashboard'))
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    );

  if (pathname.startsWith('/finance/payroll'))
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    );

  if (pathname.startsWith('/finance/reports'))
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4V7m-9 10V7a2 2 0 012-2h6a2 2 0 012 2v10m-10 0h10" />
      </svg>
    );

  if (pathname.startsWith('/finance/month-close'))
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    );

  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
};

export function FinanceLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');

  const pageTitle = getPageTitle(location.pathname);
  const pageIcon = getPageIcon(location.pathname);

  return (
    <div className="h-screen flex overflow-hidden">
      <aside className="w-64 bg-white border-r hidden lg:flex flex-col">
        <FinanceSidebar />
      </aside>

      <FinanceSidebar open={mobileMenuOpen} setOpen={setMobileMenuOpen} />

      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg border-b border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2.5 rounded-xl hover:bg-white/10 transition-all duration-200 active:scale-95"
                aria-label="Open menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">{pageIcon}</div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-white">{pageTitle}</h1>
                  {!isMobile && <p className="text-xs text-slate-300 mt-0.5">JASIQ CoreOps Platform</p>}
                </div>
              </div>
            </div>

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
                    <div className="text-xs text-slate-300">Finance Panel</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-50">
          <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
