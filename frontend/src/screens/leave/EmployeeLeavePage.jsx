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

function parseIntConfig(v, fallback) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function statusBadgeClass(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'SUBMITTED') return 'bg-blue-50 text-blue-800';
  if (s === 'APPROVED') return 'bg-emerald-50 text-emerald-800';
  if (s === 'REJECTED') return 'bg-rose-50 text-rose-800';
  if (s === 'CANCELLED') return 'bg-slate-100 text-slate-800';
  if (s === 'DRAFT') return 'bg-slate-100 text-slate-800';
  return 'bg-slate-100 text-slate-800';
}

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  if (!s) return null;
  return <span className={cx('inline-flex rounded-full px-2 py-1 text-xs font-semibold', statusBadgeClass(s))}>{s}</span>;
}

function fmtUnits(units) {
  const n = Number(units || 0);
  if (!Number.isFinite(n)) return '—';
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function isEmployeeNotLinkedError(err) {
  const msg = String(err?.payload?.error?.message || err?.message || '').toLowerCase();
  if (err?.status !== 403) return false;
  return msg.includes('employee') || msg.includes('division');
}

export function EmployeeLeavePage() {
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];
  const canReadRequests = permissions.includes('LEAVE_REQUEST_READ');
  const canReadBalances = permissions.includes('LEAVE_BALANCE_READ');
  const canCreate = permissions.includes('LEAVE_REQUEST_CREATE');

  const systemConfig = bootstrap?.systemConfig || {};
  const leaveEnabled = isTruthyConfig(systemConfig?.LEAVE_ENABLED?.value ?? systemConfig?.LEAVE_ENABLED);

  const employeeId = bootstrap?.user?.id || null;
  const year = useMemo(() => {
    const y = parseIntConfig(systemConfig?.LEAVE_DEFAULT_YEAR?.value ?? systemConfig?.LEAVE_DEFAULT_YEAR, 0);
    if (y >= 2000 && y <= 2100) return y;
    return new Date().getFullYear();
  }, [systemConfig]);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const balances = usePagedQuery({
    path: employeeId ? `/api/v1/leave/balances?employeeId=${encodeURIComponent(employeeId)}&year=${encodeURIComponent(year)}` : '/api/v1/leave/balances',
    page: 1,
    pageSize: 200,
    enabled: Boolean(employeeId) && leaveEnabled && canReadBalances
  });

  const history = usePagedQuery({
    path: employeeId ? `/api/v1/leave/requests?employeeId=${encodeURIComponent(employeeId)}` : '/api/v1/leave/requests',
    page,
    pageSize,
    enabled: Boolean(employeeId) && leaveEnabled && canReadRequests
  });

  const balanceItems = balances.data?.items || [];
  const requestItems = history.data?.items || [];
  const total = history.data?.total || 0;

  const employeeNotLinked = (balances.status === 'error' && isEmployeeNotLinkedError(balances.error)) || (history.status === 'error' && isEmployeeNotLinkedError(history.error));

  const content = useMemo(() => {
    if (!canReadRequests) return <ForbiddenState />;

    if (!leaveEnabled) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-sm font-medium text-slate-900">Leave is disabled</div>
          <div className="mt-1 text-sm text-slate-600">LEAVE_ENABLED must be enabled in system config.</div>
        </div>
      );
    }

    if (employeeNotLinked) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-900">Employee not linked</div>
          <div className="mt-1 text-sm text-amber-800">You are not linked as an employee in the system. Please contact HR/Admin.</div>
        </div>
      );
    }

    if ((history.status === 'loading' && !history.data) || (balances.status === 'loading' && !balances.data)) return <LoadingState />;

    if (history.status === 'error') return history.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={history.error} />;
    if (balances.status === 'error') return balances.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={balances.error} />;

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Leave Balances</div>
              <div className="mt-1 text-xs text-slate-500">Year: {year}</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  balances.refresh();
                  history.refresh();
                }}
                disabled={balances.status === 'loading' || history.status === 'loading'}
              >
                Refresh
              </button>
              {canCreate ? (
                <Link
                  to="/leave/apply"
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Apply Leave
                </Link>
              ) : null}
            </div>
          </div>

          <div className="p-4">
            {balanceItems.length === 0 ? (
              <EmptyState title="No leave balances" description="No leave balances are configured for this year." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {balanceItems.map((b) => {
                  const entitled = Number(b.openingBalance || 0) + Number(b.grantedBalance || 0);
                  return (
                    <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-sm font-semibold text-slate-900">{b.leaveTypeName || b.leaveTypeCode || 'Leave'}</div>
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        <div>
                          <div className="text-xs text-slate-500">Available</div>
                          <div className="mt-1 text-lg font-semibold text-slate-900">{fmtUnits(b.availableBalance)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Consumed</div>
                          <div className="mt-1 text-lg font-semibold text-slate-900">{fmtUnits(b.consumedBalance)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Entitled</div>
                          <div className="mt-1 text-lg font-semibold text-slate-900">{fmtUnits(entitled)}</div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">{b.leaveTypeIsPaid ? 'Paid leave' : 'Unpaid leave'}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-900">Leave Request History</div>
            <div className="mt-1 text-xs text-slate-500">Total: {total}</div>
          </div>

          <div className="p-4">
            {requestItems.length === 0 ? (
              <EmptyState title="No leave requests" description="You have not submitted any leave requests yet." />
            ) : (
              <>
                <div className="hidden md:block">
                  <Table
                    columns={[
                      {
                        key: 'type',
                        header: 'Leave Type',
                        render: (d) => (
                          <div>
                            <div className="text-sm font-medium text-slate-900">{d.leaveTypeName || d.leaveTypeCode || '—'}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{d.leaveTypeIsPaid ? 'Paid' : 'Unpaid'}</div>
                          </div>
                        )
                      },
                      {
                        key: 'dates',
                        header: 'Dates',
                        render: (d) => <span className="font-mono text-sm">{d.startDate} → {d.endDate}</span>
                      },
                      {
                        key: 'units',
                        header: 'Units',
                        render: (d) => <span className="text-sm text-slate-700">{fmtUnits(d.units)} ({String(d.unit || '').toUpperCase()})</span>
                      },
                      {
                        key: 'status',
                        header: 'Status',
                        render: (d) => <StatusBadge status={d.status} />
                      },
                      {
                        key: 'action',
                        header: 'Action',
                        render: (d) => (
                          <div className="flex items-center justify-end">
                            <Link
                              to={`/leave/requests/${d.id}`}
                              state={{ employeeId, item: d }}
                              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              View
                            </Link>
                          </div>
                        )
                      }
                    ]}
                    rows={requestItems.map((x) => ({ key: x.id, data: x }))}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {requestItems.map((x) => (
                    <div key={x.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 truncate">{x.leaveTypeName || x.leaveTypeCode || '—'}</div>
                          <div className="mt-1 text-xs text-slate-500">{x.leaveTypeIsPaid ? 'Paid' : 'Unpaid'}</div>
                        </div>
                        <StatusBadge status={x.status} />
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        <div>
                          <div className="text-xs text-slate-500">Dates</div>
                          <div className="font-mono text-slate-700">{x.startDate} → {x.endDate}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Units</div>
                          <div className="text-slate-700">{fmtUnits(x.units)} ({String(x.unit || '').toUpperCase()})</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Link
                          to={`/leave/requests/${x.id}`}
                          state={{ employeeId, item: x }}
                          className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View Request
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
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
  }, [balanceItems, balances, canCreate, canReadRequests, employeeId, employeeNotLinked, history, leaveEnabled, page, pageSize, requestItems, total, year]);

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="My Leave" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mt-4">{content}</div>
      </div>
    </div>
  );
}
