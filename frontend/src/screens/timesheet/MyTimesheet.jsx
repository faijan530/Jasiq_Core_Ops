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

function statusBadgeClass(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'SUBMITTED') return 'bg-blue-50 text-blue-800';
  if (s === 'APPROVED') return 'bg-emerald-50 text-emerald-800';
  if (s === 'REJECTED') return 'bg-rose-50 text-rose-800';
  if (s === 'REVISION_REQUIRED') return 'bg-amber-50 text-amber-800';
  if (s === 'DRAFT') return 'bg-slate-100 text-slate-800';
  return 'bg-slate-100 text-slate-800';
}

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  if (!s) return null;
  return <span className={cx('inline-flex rounded-full px-2 py-1 text-xs font-semibold', statusBadgeClass(s))}>{s}</span>;
}

function isEmployeeNotLinkedError(err) {
  const msg = String(err?.payload?.error?.message || err?.message || '').toLowerCase();
  return err?.status === 400 && (msg.includes('employee not found') || msg.includes('not found'));
}

export function MyTimesheet() {
  const { bootstrap, token } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];
  const roles = bootstrap?.rbac?.roles || [];
  
  // Fallback: Check JWT token role if bootstrap roles are empty
  let effectiveRoles = roles;
  if (roles.length === 0 && token) {
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const tokenRole = tokenPayload.role || tokenPayload?.claims?.role || tokenPayload?.roles?.[0];
      if (tokenRole) {
        effectiveRoles = [tokenRole];
      }
    } catch {
      // Ignore token parsing errors
    }
  }
  
  const canRead = permissions.includes('TIMESHEET_READ') || effectiveRoles.includes('EMPLOYEE');
  const isSuperAdmin = effectiveRoles.includes('SUPER_ADMIN');
  const isManager = effectiveRoles.includes('MANAGER');

  const systemConfig = bootstrap?.systemConfig || {};
  const timesheetEnabled = isTruthyConfig(systemConfig?.TIMESHEET_ENABLED?.value ?? systemConfig?.TIMESHEET_ENABLED);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const list = usePagedQuery({ path: '/api/v1/timesheets/my', page, pageSize, enabled: canRead && timesheetEnabled });

  const items = list.data?.items || [];
  const total = list.data?.total || 0;

  const employeeNotLinked = list.status === 'error' && isEmployeeNotLinkedError(list.error);

  const content = useMemo(() => {
    if (!canRead) return <ForbiddenState />;

    if (!timesheetEnabled) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-sm font-medium text-slate-900">Timesheet is disabled</div>
          <div className="mt-1 text-sm text-slate-600">TIMESHEET_ENABLED must be enabled in system config.</div>
        </div>
      );
    }

    if (list.status === 'loading' && !list.data) return <LoadingState />;

    if (employeeNotLinked) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-900">Employee not linked</div>
          <div className="mt-1 text-sm text-amber-800">You are not linked as an employee in the system. Please contact HR/Admin.</div>
        </div>
      );
    }

    if (list.status === 'error') {
      return list.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={list.error} />;
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Timesheets</div>
            <div className="mt-1 text-xs text-slate-500">Total: {total}</div>
          </div>
          <button
            type="button"
            className="w-full sm:w-auto rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={list.refresh}
            disabled={list.status === 'loading'}
          >
            {list.status === 'loading' ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="p-4">
          {items.length === 0 ? (
            <EmptyState title="No timesheets" description="No weekly timesheets found." />
          ) : (
            <div className="hidden md:block">
              <Table
                columns={[
                  {
                    key: 'week',
                    header: 'Week',
                    render: (d) => <span className="font-mono text-sm">{d.periodStart} → {d.periodEnd}</span>
                  },
                  { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
                  {
                    key: 'action',
                    header: 'Action',
                    render: (d) => (
                      <div className="flex items-center justify-end">
                        <Link
                          to={`/timesheet/${d.id}`}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </Link>
                      </div>
                    )
                  }
                ]}
                rows={items.map((x) => ({ key: x.id, data: x }))}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:hidden">
            {items.map((x) => (
              <div key={x.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500">Week</div>
                    <div className="mt-1 font-mono text-sm text-slate-900">{x.periodStart} → {x.periodEnd}</div>
                  </div>
                  <StatusBadge status={x.status} />
                </div>
                <div className="mt-3">
                  <Link
                    to={`/timesheet/${x.id}`}
                    className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View
                  </Link>
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
    );
  }, [canRead, employeeNotLinked, items, list, page, pageSize, timesheetEnabled, total]);

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="My Timesheet" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mt-4">{content}</div>
      </div>
    </div>
  );
}
