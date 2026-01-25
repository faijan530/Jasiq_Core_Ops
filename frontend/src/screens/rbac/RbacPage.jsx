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
      <div className="min-h-screen bg-slate-50">
        <PageHeader title={title} />
        <LoadingState />
      </div>
    );
  }

  if (active.status === 'error') {
    if (active.error?.status === 403) {
      return (
        <div className="min-h-screen bg-slate-50">
          <PageHeader title={title} />
          <ForbiddenState />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title={title} />
        <ErrorState error={active.error} />
      </div>
    );
  }

  const items = active.data?.items || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title={title} subtitle="Viewer only (Phase 0)." />

      <div className="mx-4 md:mx-6 lg:mx-8">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm mb-6">
          <div className="text-sm font-semibold text-slate-900 mb-3">Browse</div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            <button
              type="button"
              className={`w-full sm:w-auto rounded-md px-3 py-2 text-sm border ${tab === 'roles' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
              onClick={() => setTab('roles')}
            >
              Roles
            </button>
            <button
              type="button"
              className={`w-full sm:w-auto rounded-md px-3 py-2 text-sm border ${tab === 'permissions' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
              onClick={() => setTab('permissions')}
            >
              Permissions
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-900">{tab === 'roles' ? 'Roles' : 'Permissions'}</div>
          </div>

          {items.length === 0 ? (
            <div className="p-8">
              <EmptyState title="No data" />
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {tab === 'roles'
                  ? items.map((r) => (
                    <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="text-sm font-medium text-slate-900">{r.name}</div>
                      <div className="mt-1 text-sm text-slate-600">{r.description || '-'}</div>
                    </div>
                  ))
                  : items.map((p) => (
                    <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="font-mono text-sm text-slate-900">{p.code}</div>
                      <div className="mt-1 text-sm text-slate-600">{p.description || '-'}</div>
                    </div>
                  ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                {tab === 'roles' ? (
                  <Table
                    columns={[
                      { key: 'name', header: 'Name', render: (d) => d.name },
                      { key: 'desc', header: 'Description', render: (d) => d.description || '' }
                    ]}
                    rows={items.map((r) => ({ key: r.id, data: r }))}
                  />
                ) : (
                  <Table
                    columns={[
                      { key: 'code', header: 'Code', render: (d) => <span className="font-mono">{d.code}</span> },
                      { key: 'desc', header: 'Description', render: (d) => d.description || '' }
                    ]}
                    rows={items.map((p) => ({ key: p.id, data: p }))}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
