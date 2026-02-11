import React, { useState } from 'react';

import { PageHeader } from '../../components/PageHeader.jsx';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

export function RbacPage() {
  const { bootstrap } = useBootstrap();
  const title = bootstrap?.ui?.screens?.rbac?.title || 'RBAC';

  const [tab, setTab] = useState('roles');

  const roles = usePagedQuery({ path: '/api/v1/governance/rbac/roles', page: 1, pageSize: 200, enabled: tab === 'roles' });
  const perms = usePagedQuery({ path: '/api/v1/governance/rbac/permissions', page: 1, pageSize: 200, enabled: tab === 'permissions' });

  const active = tab === 'roles' ? roles : perms;

  if (active.status === 'loading' && !active.data) {
    return (
      <div className="min-h-screen bg-slate-100">
        {/* Global Header - matching ProjectsPage and DivisionsPage */}
        <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
          <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img 
                src="/image.png" 
                alt="JASIQ" 
                className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
              />
              <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
            </div>
          </div>
        </div>

        <div className="pt-32 sm:pt-32 lg:pt-16">
          <PageHeader title={title} variant="divisions" />
          <LoadingState />
        </div>
      </div>
    );
  }

  if (active.status === 'error') {
    if (active.error?.status === 403) {
      return (
        <div className="min-h-screen bg-slate-100">
          {/* Global Header - matching ProjectsPage and DivisionsPage */}
          <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
            <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img 
                  src="/image.png" 
                  alt="JASIQ" 
                  className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
                />
                <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
              </div>
            </div>
          </div>

          <div className="pt-32 sm:pt-32 lg:pt-16">
            <PageHeader title={title} variant="divisions" />
            <ForbiddenState />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-100">
        {/* Global Header - matching ProjectsPage and DivisionsPage */}
        <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
          <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img 
                src="/image.png" 
                alt="JASIQ" 
                className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
              />
              <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
            </div>
          </div>
        </div>

        <div className="pt-32 sm:pt-32 lg:pt-16">
          <PageHeader title={title} variant="divisions" />
          <ErrorState error={active.error} />
        </div>
      </div>
    );
  }

  const items = active.data?.items || [];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Global Header - matching ProjectsPage and DivisionsPage */}
      <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
        <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img 
              src="/image.png" 
              alt="JASIQ" 
              className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
            />
            <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
          </div>
        </div>
      </div>

      <div className="pt-32 sm:pt-32 lg:pt-16">
        <PageHeader
          title="Role & Permission Viewer"
          subtitle="Viewer only (Phase 0)"
          variant="divisions"
        />

        <div className="mx-4 md:mx-6 lg:mx-8">
          {/* Tab Navigation - matching Divisions/Projects style */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Browse</div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  tab === 'roles'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                onClick={() => setTab('roles')}
              >
                Roles
              </button>
              <button
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  tab === 'permissions'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                onClick={() => setTab('permissions')}
              >
                Permissions
              </button>
            </div>
          </div>

          {/* Content Area - matching Divisions/Projects card style */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <div className="text-base font-semibold text-slate-900">
                {tab === 'roles' ? 'Roles' : 'Permissions'}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {tab === 'roles' 
                  ? 'System roles and their descriptions'
                  : 'Available permissions in the system'
                }
              </div>
            </div>

            {items.length === 0 ? (
              <div className="p-8">
                <EmptyState title={`No ${tab} found`} />
              </div>
            ) : (
              <div className="p-6">
                {/* Mobile Card Layout */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {tab === 'roles'
                    ? items.map((r) => (
                        <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-900">{r.name}</div>
                              <div className="mt-2 text-sm text-slate-600">{r.description || 'No description available'}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    : items.map((p) => (
                        <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-mono text-sm text-slate-900">{p.code}</div>
                              <div className="mt-2 text-sm text-slate-600">{p.description || 'No description available'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    {tab === 'roles' ? (
                      <Table
                        columns={[
                          { key: 'name', title: 'Role Name', render: (_v, d) => <span className="font-medium text-slate-900">{d.name}</span> },
                          { key: 'desc', title: 'Description', render: (_v, d) => <span className="text-slate-600">{d.description || 'No description'}</span> }
                        ]}
                        data={items}
                        empty="No roles found"
                      />
                    ) : (
                      <Table
                        columns={[
                          { key: 'code', title: 'Permission Code', render: (_v, d) => <span className="font-mono text-sm text-slate-900">{d.code}</span> },
                          { key: 'desc', title: 'Description', render: (_v, d) => <span className="text-slate-600">{d.description || 'No description'}</span> }
                        ]}
                        data={items}
                        empty="No permissions found"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
