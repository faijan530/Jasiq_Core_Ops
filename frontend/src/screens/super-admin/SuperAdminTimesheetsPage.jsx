import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { PageHeader } from '../../components/PageHeader.jsx';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function isTruthyConfig(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'enabled' || s === 'on';
}

function formatName(r) {
  const fn = String(r?.firstName || '').trim();
  const ln = String(r?.lastName || '').trim();
  return `${fn} ${ln}`.trim() || '—';
}

function statusBadgeClass(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'SUBMITTED') return 'bg-blue-50 text-blue-800';
  if (s === 'APPROVED') return 'bg-emerald-50 text-emerald-800';
  if (s === 'REJECTED') return 'bg-rose-50 text-rose-800';
  if (s === 'REVISION_REQUIRED') return 'bg-amber-50 text-amber-800';
  if (s === 'DRAFT') return 'bg-slate-100 text-slate-800';
  return 'bg-slate-100 text-slate-800';
}

function getTimesheetStatusLabel({ status, approvalLevel }) {
  const s = String(status || '').toUpperCase();
  const level = String(approvalLevel || '').toUpperCase();

  if (s === 'SUBMITTED') {
    if (level === 'L2') return 'Pending for L2';
    return 'Pending for L1';
  }

  return s || '-';
}

function StatusBadge({ status, approvalLevel }) {
  const s = String(status || '').toUpperCase();
  if (!s) return null;
  const label = getTimesheetStatusLabel({ status: s, approvalLevel });
  return <span className={cx('inline-flex rounded-full px-2 py-1 text-xs font-semibold', statusBadgeClass(s))}>{label}</span>;
}

export function SuperAdminTimesheetsPage() {
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];
  const roles = bootstrap?.rbac?.roles || [];
  const canReadQueue = permissions.includes('TIMESHEET_APPROVAL_QUEUE_READ');
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  const systemConfig = bootstrap?.systemConfig || {};
  const timesheetEnabled = isTruthyConfig(systemConfig?.TIMESHEET_ENABLED?.value ?? systemConfig?.TIMESHEET_ENABLED);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [search, setSearch] = useState('');

  // Production-safe: API call with proper error handling
  const list = usePagedQuery({ 
    path: '/api/v1/timesheets/approvals', 
    page, 
    pageSize, 
    enabled: canReadQueue && timesheetEnabled 
  });

  // Production-safe: Always provide safe defaults
  const items = Array.isArray(list.data?.items) ? list.data.items : [];
  const total = Number(list.data?.total) || 0;

  const filtered = useMemo(() => {
    // Production-safe: Always return array
    if (!Array.isArray(items)) return [];
    
    const q = String(search || '').trim().toLowerCase();
    if (!q) return items;
    
    return items.filter((r) => {
      // Production-safe: Handle undefined/null properties
      const hay = `${r?.employeeCode || ''} ${formatName(r)} ${r?.periodStart || ''} ${r?.periodEnd || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  const tableColumns = useMemo(() => {
    const baseColumns = [
      {
        key: 'employee',
        header: 'Employee',
        render: (d) => (
          <div>
            <div className="text-sm font-semibold text-slate-900">{formatName(d)}</div>
            <div className="mt-1 font-mono text-xs text-slate-600">{d?.employeeCode || '—'}</div>
          </div>
        )
      },
      {
        key: 'week',
        header: 'Week',
        render: (d) => <span className="font-mono text-sm">{d?.periodStart || '—'} → {d?.periodEnd || '—'}</span>
      },
      { 
        key: 'status', 
        header: 'Status', 
        render: (d) => <StatusBadge status={d?.status} approvalLevel={d?.approvalLevel} /> 
      }
    ];

    // Only add Action column for non-SuperAdmin users
    if (!isSuperAdmin) {
      baseColumns.push({
        key: 'action',
        header: 'Action',
        render: (d) => (
          <div className="flex items-center justify-end">
            <Link
              to={`/timesheet/${d?.id}`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View
            </Link>
          </div>
        )
      });
    }

    return baseColumns;
  }, [isSuperAdmin]);

  const content = useMemo(() => {
    // Production-safe: Always return valid JSX
    if (!canReadQueue) return <ForbiddenState />;

    if (!timesheetEnabled) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-sm font-medium text-slate-900">Timesheet is disabled</div>
          <div className="mt-1 text-sm text-slate-600">TIMESHEET_ENABLED must be enabled in system config.</div>
        </div>
      );
    }

    if (list.status === 'loading' && !list.data) return <LoadingState />;

    if (list.status === 'error') {
      return list.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={list.error} />;
    }

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-600">Search</label>
              <input
                className="mt-1 w-full rounded-md border-slate-300 text-sm"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Employee code or name"
              />
            </div>
            <div className="md:col-span-1 flex items-end justify-end">
              <button
                type="button"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={list.refresh}
                disabled={list.status === 'loading'}
              >
                {list.status === 'loading' ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="bg-gradient-to-r from-purple-50 to-violet-50/50 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                Timesheet Approval Queue
              </div>
              <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                <span className="text-sm font-medium text-slate-700">{total} total</span>
              </div>
            </div>
          </div>

          <div className="p-4">
            {!Array.isArray(filtered) || filtered.length === 0 ? (
              <EmptyState 
                title="No timesheets available" 
                description="No timesheets found in the approval queue." 
              />
            ) : (
              <div className="hidden md:block">
                <Table
                  columns={tableColumns}
                  rows={filtered.map((x) => ({ key: x?.id || Math.random(), data: x }))}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filtered.map((x) => (
                <div key={x?.id || Math.random()} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{formatName(x)}</div>
                      <div className="mt-1 font-mono text-xs text-slate-600">{x?.employeeCode || '—'}</div>
                    </div>
                    <StatusBadge status={x?.status} approvalLevel={x?.approvalLevel} />
                  </div>

                  <div className="mt-3 text-xs text-slate-500">Week</div>
                  <div className="mt-1 font-mono text-sm text-slate-900">{x?.periodStart || '—'} → {x?.periodEnd || '—'}</div>

                  <div className="mt-3">
                    {!isSuperAdmin && (
                      <Link
                        to={`/timesheet/${x?.id}`}
                        className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 pt-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                className="w-full sm:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <div className="text-sm text-slate-600">Page {page}</div>
              <button
                type="button"
                className="w-full sm:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [canReadQueue, filtered, list, page, pageSize, search, timesheetEnabled, total, isSuperAdmin, tableColumns]);

  // Production-safe: Always return valid JSX
  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Timesheets" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mt-4">{content}</div>
      </div>
    </div>
  );
}
