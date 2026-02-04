import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { useBootstrap } from '../state/bootstrap.jsx';

export function AdminLayout() {
  const { bootstrap, setToken, refresh } = useBootstrap();
  const navItems = bootstrap?.navigation?.items || [];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile top bar */}
      <div className="md:hidden bg-white border-b border-slate-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => setMobileNavOpen(true)}
          >
            Menu
          </button>
          <div>
            <div className="text-sm font-semibold text-slate-900">JASIQ CoreOps</div>
            <div className="text-xs text-slate-500">Governance</div>
          </div>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => {
              setToken(null);
              refresh(null);
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileNavOpen(false)} />
          <div className="relative h-full w-80 max-w-[85vw] bg-white border-r border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-slate-900">JASIQ CoreOps</div>
                <div className="text-xs text-slate-500">Governance Foundation</div>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => setMobileNavOpen(false)}
              >
                Close
              </button>
            </div>

            <nav className="p-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-sm ${
                      isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:flex-col w-72 bg-white border-r border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="text-base font-semibold text-slate-900">JASIQ CoreOps</div>
            <div className="text-xs text-slate-500">Governance Foundation</div>
          </div>

          <nav className="p-3">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-sm ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto p-3 border-t border-slate-200">
            <button
              type="button"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              onClick={() => {
                setToken(null);
                refresh(null);
              }}
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
