import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
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
  if (s === 'CANCELLED') return 'bg-slate-100 text-slate-800';
  return 'bg-slate-100 text-slate-800';
}

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  if (!s) return null;
  return <span className={cx('inline-flex rounded-full px-2 py-1 text-xs font-semibold', statusBadgeClass(s))}>{s}</span>;
}

function toMonthEndIso(dateIso) {
  const d = new Date(`${dateIso}T00:00:00.000Z`);
  const utcEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return utcEnd.toISOString().slice(0, 10);
}

export function LeaveApprovalPage() {
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];
  const canRead = permissions.includes('LEAVE_REQUEST_READ');
  const canApproveL1 = permissions.includes('LEAVE_APPROVE_L1');
  const canApproveL2 = permissions.includes('LEAVE_APPROVE_L2');
  const canReadMonthClose = permissions.includes('GOV_MONTH_CLOSE_READ');

  const systemConfig = bootstrap?.systemConfig || {};
  const features = bootstrap?.features?.flags || {};

  const leaveEnabled = isTruthyConfig(systemConfig?.LEAVE_ENABLED?.value ?? systemConfig?.LEAVE_ENABLED);
  const monthCloseEnabled = Boolean(features?.MONTH_CLOSE_ENABLED);

  const canAct = Boolean(canApproveL1 || canApproveL2);

  const [divisionId, setDivisionId] = useState('');
  const [divisionIdInput, setDivisionIdInput] = useState('');
  const [divisionError, setDivisionError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const listPath = useMemo(() => {
    const u = new URL('/api/v1/leave/requests', 'http://local');
    u.searchParams.set('page', String(page));
    u.searchParams.set('pageSize', String(pageSize));
    u.searchParams.set('status', 'SUBMITTED');
    if (divisionId.trim()) u.searchParams.set('divisionId', divisionId.trim());
    return u.pathname + u.search;
  }, [divisionId, page, pageSize]);

  const list = usePagedQuery({ path: '/api/v1/leave/requests', page, pageSize, enabled: leaveEnabled && canRead && canAct });

  const items = useMemo(() => {
    const filtered = [...(list.data?.items || [])];
    const statusFilter = 'SUBMITTED';
    return statusFilter ? filtered.filter(item => String(item.status || '').toUpperCase() === statusFilter) : filtered;
  }, [list.data]);
  const total = list.data?.total || 0;

  const monthClose = usePagedQuery({
    path: '/api/v1/governance/month-close',
    page: 1,
    pageSize: 200,
    enabled: monthCloseEnabled && canReadMonthClose
  });

  const closedMonthSet = useMemo(() => {
    const set = new Set();
    for (const row of monthClose.data?.items || []) {
      const m = row?.monthEnd || row?.monthStart || row?.month;
      if (!m) continue;
      if (String(row?.status || '').toUpperCase() !== 'CLOSED') continue;
      set.add(String(m).slice(0, 10));
    }
    return set;
  }, [monthClose.data]);

  const approveMutation = useMutation(async ({ id, reason }) => {
    return apiFetch(`/api/v1/leave/requests/${id}/approve`, { method: 'POST', body: { reason: reason || null } });
  });

  const rejectMutation = useMutation(async ({ id, reason }) => {
    return apiFetch(`/api/v1/leave/requests/${id}/reject`, { method: 'POST', body: { reason } });
  });

  const [modal, setModal] = useState(null); // { mode: 'approve'|'reject', item }
  const [reason, setReason] = useState('');

  const content = useMemo(() => {
    if (!canRead) return <ForbiddenState />;

    if (!leaveEnabled) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-sm font-medium text-slate-900">Leave is disabled</div>
          <div className="mt-1 text-sm text-slate-600">LEAVE_ENABLED must be enabled in system config.</div>
        </div>
      );
    }

    if (!canAct) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-sm font-medium text-slate-900">Approvals not accessible</div>
          <div className="mt-1 text-sm text-slate-600">You need LEAVE_APPROVE_L1 or LEAVE_APPROVE_L2 permission.</div>
        </div>
      );
    }

    if (list.status === 'loading' && !list.data) return <LoadingState />;

    if (list.status === 'error') return list.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={list.error} />;

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Leave Approvals</div>
              <div className="mt-1 text-xs text-slate-500">Total: {total}</div>
            </div>
            <button
              type="button"
              className="w-full sm:w-auto rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={list.refresh}
              disabled={list.status === 'loading' || approveMutation.status === 'loading' || rejectMutation.status === 'loading'}
            >
              Refresh
            </button>
          </div>

          <div className="p-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Division Id (optional)</label>
              <input
                className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono min-h-[44px]"
                value={divisionIdInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setDivisionIdInput(v);
                  if (v.trim() === '') {
                    setDivisionId('');
                    setDivisionError('');
                    setPage(1);
                  } else {
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (uuidRegex.test(v.trim())) {
                      setDivisionId(v.trim());
                      setDivisionError('');
                      setPage(1);
                    } else {
                      setDivisionError('Please enter a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)');
                    }
                  }
                }}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
              <div className="mt-1 text-xs text-slate-500">Filter the approval queue to a specific division.</div>
              {divisionError ? (
                <div className="mt-1 text-xs text-rose-600">{divisionError}</div>
              ) : null}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-medium text-slate-900">Month Close</div>
              <div className="mt-1 text-xs text-slate-600">
                {monthCloseEnabled
                  ? (canReadMonthClose ? 'Closed months are marked if readable.' : 'You do not have GOV_MONTH_CLOSE_READ permission.')
                  : 'Month-close feature is disabled.'}
              </div>
            </div>
          </div>

          <div className="p-4">
            {items.length === 0 ? (
              <EmptyState title="No pending requests" description="No SUBMITTED leave requests found for your scope." />
            ) : (
              <>
                <div className="hidden md:block">
                  <Table
                    columns={[
                      {
                        key: 'employee',
                        header: 'Employee',
                        render: (d) => (
                          <div>
                            <div className="text-sm font-medium text-slate-900">{d.employeeCode || String(d.employeeId).slice(0, 8) + '…'}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{d.firstName || ''} {d.lastName || ''}</div>
                          </div>
                        )
                      },
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
                        render: (d) => {
                          const start = String(d.startDate || '').slice(0, 10);
                          const end = String(d.endDate || '').slice(0, 10);
                          const startMonthEnd = start ? toMonthEndIso(start) : null;
                          const endMonthEnd = end ? toMonthEndIso(end) : null;
                          const isClosed = Boolean(startMonthEnd && closedMonthSet.has(startMonthEnd)) || Boolean(endMonthEnd && closedMonthSet.has(endMonthEnd));
                          return (
                            <div>
                              <div className="font-mono text-sm text-slate-900">{start} → {end}</div>
                              {monthCloseEnabled && canReadMonthClose ? (
                                <div className={cx('mt-0.5 text-xs', isClosed ? 'text-amber-700' : 'text-slate-500')}>{isClosed ? 'Month CLOSED' : 'Month open'}</div>
                              ) : null}
                            </div>
                          );
                        }
                      },
                      { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
                      {
                        key: 'action',
                        header: 'Action',
                        render: (d) => (
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/leave/requests/${d.id}`}
                              state={{ item: d, employeeId: d.employeeId }}
                              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                              disabled={approveMutation.status === 'loading' || rejectMutation.status === 'loading'}
                              onClick={() => {
                                setReason('');
                                setModal({ mode: 'approve', item: d });
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:bg-rose-300"
                              disabled={approveMutation.status === 'loading' || rejectMutation.status === 'loading'}
                              onClick={() => {
                                setReason('');
                                setModal({ mode: 'reject', item: d });
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        )
                      }
                    ]}
                    rows={items.map((x) => ({ key: x.id, data: x }))}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {items.map((x) => {
                    const start = String(x.startDate || '').slice(0, 10);
                    const end = String(x.endDate || '').slice(0, 10);
                    const startMonthEnd = start ? toMonthEndIso(start) : null;
                    const endMonthEnd = end ? toMonthEndIso(end) : null;
                    const isClosed = Boolean(startMonthEnd && closedMonthSet.has(startMonthEnd)) || Boolean(endMonthEnd && closedMonthSet.has(endMonthEnd));

                    return (
                      <div key={x.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{x.firstName || ''} {x.lastName || ''}</div>
                            <div className="mt-1 text-xs text-slate-500">{x.employeeCode || String(x.employeeId).slice(0, 8) + '…'}</div>
                          </div>
                          <StatusBadge status={x.status} />
                        </div>
                        <div className="mt-3">
                          <div className="text-xs text-slate-500">Leave</div>
                          <div className="mt-0.5 text-sm text-slate-900">{x.leaveTypeName || x.leaveTypeCode}</div>
                          <div className="mt-2 font-mono text-sm text-slate-700">{start} → {end}</div>
                          {monthCloseEnabled && canReadMonthClose ? (
                            <div className={cx('mt-1 text-xs', isClosed ? 'text-amber-700' : 'text-slate-500')}>{isClosed ? 'Month CLOSED' : 'Month open'}</div>
                          ) : null}
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2">
                          <Link
                            to={`/leave/requests/${x.id}`}
                            state={{ item: x, employeeId: x.employeeId }}
                            className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                            disabled={approveMutation.status === 'loading' || rejectMutation.status === 'loading'}
                            onClick={() => {
                              setReason('');
                              setModal({ mode: 'approve', item: x });
                            }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-center rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:bg-rose-300"
                            disabled={approveMutation.status === 'loading' || rejectMutation.status === 'loading'}
                            onClick={() => {
                              setReason('');
                              setModal({ mode: 'reject', item: x });
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
  }, [approveMutation.status, canAct, canRead, canReadMonthClose, closedMonthSet, divisionId, items, leaveEnabled, list, monthCloseEnabled, page, pageSize, rejectMutation.status, total]);

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Leave Approvals" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mt-4">{content}</div>
      </div>

      {modal ? (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (approveMutation.status === 'loading' || rejectMutation.status === 'loading') return;
              setModal(null);
            }}
          />
          <div className="relative w-full max-w-xl rounded-xl bg-white border border-slate-200 shadow-sm p-5 max-h-[90vh] overflow-y-auto">
            <div className="text-base font-semibold text-slate-900">{modal.mode === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}</div>
            <div className="mt-1 text-sm text-slate-600">
              {modal.mode === 'approve'
                ? 'Reason is optional; it may be required if a month-close override is needed.'
                : 'Reason is required.'}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">Reason</label>
              <textarea
                className="mt-1 w-full rounded-md border-slate-300 text-sm"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={modal.mode === 'approve' ? 'Optional' : 'Required'}
              />
            </div>

            {(approveMutation.status === 'error' || rejectMutation.status === 'error') ? (
              <div className="mt-3">
                <ErrorState error={approveMutation.error || rejectMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="w-full sm:w-auto rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px]"
                onClick={() => {
                  if (approveMutation.status === 'loading' || rejectMutation.status === 'loading') return;
                  setModal(null);
                  setReason('');
                }}
                disabled={approveMutation.status === 'loading' || rejectMutation.status === 'loading'}
              >
                Cancel
              </button>
              <button
                type="button"
                className={cx(
                  'w-full sm:w-auto rounded-md px-4 py-3 text-sm font-medium text-white min-h-[44px]',
                  modal.mode === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300'
                    : 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300'
                )}
                disabled={
                  approveMutation.status === 'loading' ||
                  rejectMutation.status === 'loading' ||
                  (modal.mode === 'reject' && reason.trim().length === 0)
                }
                onClick={async () => {
                  const trimmed = reason.trim();
                  try {
                    if (modal.mode === 'approve') {
                      await approveMutation.run({ id: modal.item.id, reason: trimmed || null });
                    } else {
                      await rejectMutation.run({ id: modal.item.id, reason: trimmed });
                    }
                    setModal(null);
                    setReason('');
                    list.refresh();
                  } catch {
                    // state already set by hooks
                  }
                }}
              >
                {modal.mode === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
        </>
      ) : null}
    </div>
  );
}
