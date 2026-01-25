import React, { useMemo, useState } from 'react';

import { PageHeader } from '../../components/PageHeader.jsx';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

const ACTOR_OPTIONS = [
  { label: 'Admin', value: '00000000-0000-0000-0000-000000000001' },
  { label: 'System', value: 'system' },
  { label: 'Service Account', value: 'service-account' }
];

function buildPath(filters) {
  const u = new URL('/api/v1/governance/audit', 'http://local');
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === '' || v === 'undefined') continue;
    u.searchParams.set(k, String(v));
  }
  return u.pathname + u.search;
}

function formatActorId(id) {
  if (!id) return 'System';
  if (id === '00000000-0000-0000-0000-000000000001') return 'Admin';
  if (id === 'system') return 'System';
  if (id === 'service-account') return 'Service Account';
  return id.slice(0, 8) + '…';
}

function renderActor(d) {
  const raw = d?.actorId;
  const label = formatActorId(raw);
  return (
    <span className="font-mono text-xs" title={raw || ''}>
      {label}
    </span>
  );
}

function formatEntity(entityType, entityId) {
  if (!entityType) return '—';
  return entityId ? `${entityType}:${entityId.slice(0, 8)}…` : entityType;
}

export function AuditPage() {
  const { bootstrap } = useBootstrap();
  const title = bootstrap?.ui?.screens?.audit?.title || 'Audit Logs';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');

  const cleanedEntityType = entityType.trim();
  const cleanedAction = action.trim();

  const path = useMemo(() => {
    const filters = {};
    if (cleanedEntityType) filters.entityType = cleanedEntityType;
    if (cleanedAction) filters.action = cleanedAction;
    if (actor) filters.actorId = actor;
    return buildPath(filters);
  }, [cleanedEntityType, cleanedAction, actor]);

  const list = usePagedQuery({ path: path || '/api/v1/governance/audit', page, pageSize, enabled: !!path });

  const items = list.data?.items || [];
  const total = list.data?.total || 0;

  if (list.status === 'loading' && !list.data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title={title} />
        <LoadingState />
      </div>
    );
  }

  if (list.status === 'error') {
    if (list.error?.status === 403) {
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
        <ErrorState error={list.error} />
        {list.error?.payload?.error?.message ? (
          <div className="mx-4 mt-2 text-sm text-rose-700 md:mx-6 lg:mx-8">Backend: {list.error.payload.error.message}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title={title} />

      {/* Warning Banner */}
      <div className="mx-4 mt-4 mb-2 md:mx-6 lg:mx-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
          <div>
            <p className="text-sm font-medium text-blue-800">Append-only audit trail</p>
            <p className="text-xs text-blue-700 mt-1">Every governance action is recorded. Use filters to search.</p>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="mx-4 mb-6 md:mx-6 lg:mx-8">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900 mb-3">Filters</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Entity Type</label>
              <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={entityType} onChange={(e) => { setEntityType(e.target.value); }} placeholder="division" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Action</label>
              <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={action} onChange={(e) => { setAction(e.target.value); }} placeholder="CREATE" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Actor</label>
              <div className="mt-1 text-xs text-slate-500">Select actor who performed the action</div>
              <select
                className="mt-1 w-full rounded-md border-slate-300 text-sm"
                value={actor}
                onChange={(e) => {
                  setActor(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Any</option>
                {ACTOR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            className="mt-3 w-full md:w-auto px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium disabled:bg-slate-400 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
            disabled={!path}
            onClick={() => { setPage(1); }}
          >
            Filter
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="mx-4 mb-6 md:mx-6 lg:mx-8">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Audit Trail</h2>
          </div>
          {items.length === 0 ? (
            <div className="p-8">
              <EmptyState title="No audit logs" />
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {items.map((a) => (
                  <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-slate-500">Time</div>
                        <div className="mt-1 text-sm text-slate-900">{new Date(a.createdAt).toLocaleString()}</div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        a.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                        a.action === 'UPDATE' || a.action === 'ACTIVATE' ? 'bg-blue-100 text-blue-800' :
                        a.action === 'DELETE' || a.action === 'DEACTIVATE' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>{a.action}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <div>
                        <div className="text-xs font-medium text-slate-500">Entity</div>
                        <div className="mt-1 font-mono text-sm text-slate-900">{formatEntity(a.entityType, a.entityId)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs font-medium text-slate-500">Actor</div>
                          <div className="mt-1">{renderActor(a)}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-500">Request</div>
                          <div className="mt-1 font-mono text-xs text-slate-700">{a.requestId.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table
                  columns={[
                    { key: 'createdAt', header: 'Time', render: (d) => <span className="text-xs text-slate-600">{new Date(d.createdAt).toLocaleString()}</span> },
                    { key: 'entity', header: 'Entity', render: (d) => <span className="font-mono text-sm">{formatEntity(d.entityType, d.entityId)}</span> },
                    { key: 'action', header: 'Action', render: (d) => (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        d.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                        d.action === 'UPDATE' || d.action === 'ACTIVATE' ? 'bg-blue-100 text-blue-800' :
                        d.action === 'DELETE' || d.action === 'DEACTIVATE' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>{d.action}</span>
                    )},
                    { key: 'actor', header: 'Actor', render: (d) => renderActor(d) },
                    { key: 'request', header: 'Request', render: (d) => <span className="font-mono text-xs">{d.requestId.slice(0, 8)}…</span> }
                  ]}
                  rows={items.map((a) => ({ key: a.id, data: a }))}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="mx-4 mb-8 md:mx-6 lg:mx-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            className="w-full sm:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <div className="text-sm text-slate-600">Page {page} / Total {total}</div>
          <button
            type="button"
            className="w-full sm:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
