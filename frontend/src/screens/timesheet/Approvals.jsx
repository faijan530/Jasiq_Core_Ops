import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { useMutation } from '../../hooks/useMutation.js';

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

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  if (!s) return null;
  return <span className={cx('inline-flex rounded-full px-2 py-1 text-xs font-semibold', statusBadgeClass(s))}>{s}</span>;
}

function isPendingRow(r) {
  const s = String(r?.status || '').toUpperCase();
  if (s === 'SUBMITTED') return true;
  if (s === 'APPROVED' && r?.approvedL1At && !r?.approvedL2At) return true;
  return false;
}

function getCurrentWeekRange() {
  const now = new Date();
  const currentDay = now.getDay();
  const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  const sunday = new Date(now.setDate(diff + 6));
  
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
    display: `${monday.toLocaleDateString()} - ${sunday.toLocaleDateString()}`
  };
}

export function Approvals() {
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];
  const roles = bootstrap?.rbac?.roles || [];
  const canReadQueue = permissions.includes('TIMESHEET_APPROVAL_QUEUE_READ');
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  const canApproveL1 = permissions.includes('TIMESHEET_APPROVE_L1') || isSuperAdmin;
  const canApproveL2 = permissions.includes('TIMESHEET_APPROVE_L2') || isSuperAdmin;
  const canAct = Boolean(canApproveL1 || canApproveL2);

  const systemConfig = bootstrap?.systemConfig || {};
  const timesheetEnabled = isTruthyConfig(systemConfig?.TIMESHEET_ENABLED?.value ?? systemConfig?.TIMESHEET_ENABLED);
  const approvalLevels = parseInt(systemConfig?.TIMESHEET_APPROVAL_LEVELS?.value) || 1;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [weekFilterStart, setWeekFilterStart] = useState('');
  const [weekFilterEnd, setWeekFilterEnd] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [sortColumn, setSortColumn] = useState('submittedOn');
  const [sortDirection, setSortDirection] = useState('desc');

  const approveMutation = useMutation(async ({ id }) => {
    return apiFetch(`/api/v1/timesheets/${id}/approve`, { method: 'POST', body: {} });
  });

  const rejectMutation = useMutation(async ({ id, reason }) => {
    return apiFetch(`/api/v1/timesheets/${id}/reject`, { method: 'POST', body: { reason } });
  });

  const [modal, setModal] = useState(null); // { mode: 'reject', item }
  const [reason, setReason] = useState('');

  const currentWeek = getCurrentWeekRange();

  const actingStage = useMemo(() => {
    if (approvalLevels === 1) return 'L1';
    if (canApproveL2 && !canApproveL1) return 'L2 (Final)';
    return 'L1';
  }, [approvalLevels, canApproveL1, canApproveL2]);

  const list = usePagedQuery({ path: '/api/v1/timesheets/approvals', page, pageSize, enabled: canReadQueue && timesheetEnabled });

  const items = list.data?.items || [];
  const total = list.data?.total || 0;

  // Calculate tab counts from existing data
  const tabCounts = useMemo(() => {
    const pending = items.filter((r) => isPendingRow(r)).length;
    const approved = items.filter(r => String(r.status || '').toUpperCase() === 'APPROVED').length;
    const rejected = items.filter(r => String(r.status || '').toUpperCase() === 'REJECTED').length;
    return { pending, approved, rejected };
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    
    // Apply tab filter (UI only)
    if (activeTab === 'approved') {
      result = result.filter(r => String(r.status || '').toUpperCase() === 'APPROVED');
    } else if (activeTab === 'rejected') {
      result = result.filter(r => String(r.status || '').toUpperCase() === 'REJECTED');
    } else {
      result = result.filter((r) => isPendingRow(r));
    }
    
    // Apply search filter
    const q = String(search || '').trim().toLowerCase();
    if (q) {
      result = result.filter((r) => {
        const hay = `${r.employeeCode || ''} ${formatName(r)} ${r.periodStart || ''} ${r.periodEnd || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    
    // Apply status filter (UI only)
    if (statusFilter !== 'ALL') {
      result = result.filter(r => String(r.status || '').toUpperCase() === statusFilter);
    }
    
    // Apply week filter (UI only)
    if (weekFilterStart && weekFilterEnd) {
      result = result.filter(r => r.periodStart >= weekFilterStart && r.periodEnd <= weekFilterEnd);
    }
    
    return result;
  }, [items, search, statusFilter, weekFilterStart, weekFilterEnd, activeTab]);

  const tableColumns = useMemo(() => {
    const baseColumns = [
      {
        key: 'employee',
        header: (
          <button
            onClick={() => {
              if (sortColumn === 'employee') {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                setSortColumn('employee');
                setSortDirection('asc');
              }
            }}
            aria-sort={sortColumn === 'employee' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            className={cx(
              'flex items-center gap-1 text-left font-medium px-2 py-1 rounded transition-colors',
              sortColumn === 'employee' 
                ? 'text-slate-900 font-semibold bg-slate-100' 
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            )}
          >
            Employee Name
            <span className={cx(
              'text-xs',
              sortColumn === 'employee' ? 'text-slate-900' : 'text-slate-400'
            )}>
              {sortColumn === 'employee' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
            </span>
          </button>
        ),
        render: (d) => (
          <div>
            <div className="text-sm font-semibold text-slate-900">{formatName(d)}</div>
            <div className="mt-1 font-mono text-xs text-slate-600">{d.employeeCode || '—'}</div>
          </div>
        )
      },
      {
        key: 'employeeCode',
        header: 'Employee Code',
        render: (d) => <span className="font-mono text-sm text-slate-900">{d.employeeCode || '—'}</span>
      },
      {
        key: 'week',
        header: 'Week Range',
        render: (d) => <span className="font-mono text-sm text-slate-900">{d.periodStart} → {d.periodEnd}</span>
      },
      {
        key: 'totalHours',
        header: (
          <button
            onClick={() => {
              if (sortColumn === 'totalHours') {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                setSortColumn('totalHours');
                setSortDirection('desc');
              }
            }}
            aria-sort={sortColumn === 'totalHours' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            className={cx(
              'flex items-center justify-end gap-1 text-right font-medium px-2 py-1 rounded transition-colors',
              sortColumn === 'totalHours' 
                ? 'text-slate-900 font-semibold bg-slate-100' 
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            )}
          >
            Total Hours
            <span className={cx(
              'text-xs',
              sortColumn === 'totalHours' ? 'text-slate-900' : 'text-slate-400'
            )}>
              {sortColumn === 'totalHours' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
            </span>
          </button>
        ),
        render: (d) => <span className="text-sm font-medium text-slate-900 text-right block">{d.totalHours || '0'}</span>
      },
      {
        key: 'submittedOn',
        header: (
          <button
            onClick={() => {
              if (sortColumn === 'submittedOn') {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                setSortColumn('submittedOn');
                setSortDirection('desc');
              }
            }}
            aria-sort={sortColumn === 'submittedOn' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            className={cx(
              'flex items-center gap-1 text-left font-medium px-2 py-1 rounded transition-colors',
              sortColumn === 'submittedOn' 
                ? 'text-slate-900 font-semibold bg-slate-100' 
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            )}
          >
            Submitted On
            <span className={cx(
              'text-xs',
              sortColumn === 'submittedOn' ? 'text-slate-900' : 'text-slate-400'
            )}>
              {sortColumn === 'submittedOn' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
            </span>
          </button>
        ),
        render: (d) => <span className="text-sm text-slate-900">{d.submittedAt ? new Date(d.submittedAt).toLocaleDateString() : '—'}</span>
      },
      { 
        key: 'status', 
        header: 'Status', 
        render: (d) => (
          <div className="flex justify-center">
            <StatusBadge status={d.status} />
          </div>
        )
      },
      {
        key: 'approvalLevel',
        header: 'Approval Level',
        render: (d) => {
          const pendingLevel = Number(d?.pendingApprovalLevel || 1);
          const level = pendingLevel === 2 ? 'L2' : 'L1';
          const isFinal = approvalLevels === 1 || (approvalLevels === 2 && level === 'L2');
          
          return (
            <div className="flex items-center gap-2">
              <span className={cx(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm',
                level === 'L1' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800' : 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800'
              )}>
                {level}
              </span>
              {isFinal && (
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-100 to-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
                  Final
                </span>
              )}
            </div>
          );
        }
      }
    ];

    // Always add Action column for consistency
    baseColumns.push({
      key: 'action',
      header: 'Actions',
      render: (d) => (
        <div className="flex items-center justify-end gap-2">
          {!isSuperAdmin && (
            <Link
              to={`/timesheet/${d.id}`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              View
            </Link>
          )}

          {canAct && isPendingRow(d) ? (
            <>
              <button
                type="button"
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                disabled={approveMutation.status === 'loading' || rejectMutation.status === 'loading'}
                onClick={async () => {
                  await approveMutation.run({ id: d.id });
                  await list.refresh();
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
            </>
          ) : null}
        </div>
      )
    });

    return baseColumns;
  }, [isSuperAdmin, filtered, sortColumn, sortDirection, approvalLevels]);

  const content = useMemo(() => {
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
        {/* System Context Info */}
        <div className="bg-gradient-to-r from-white to-blue-50 rounded-2xl border border-blue-200 shadow-lg p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-xs font-medium text-white shadow-md">
                Acting as Approver
              </span>
              <span
                className={cx(
                  'inline-flex items-center rounded-full px-3 py-2 text-xs font-semibold shadow-sm',
                  String(actingStage).startsWith('L2') ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                )}
              >
                Queue: {actingStage}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center rounded-md bg-white/80 backdrop-blur-sm px-3 py-1.5 border border-slate-200 shadow-sm">
                Pending: {tabCounts.pending}
              </span>
              <span className="inline-flex items-center rounded-md bg-white/80 backdrop-blur-sm px-3 py-1.5 border border-slate-200 shadow-sm">
                Approved: {tabCounts.approved}
              </span>
              <span className="inline-flex items-center rounded-md bg-white/80 backdrop-blur-sm px-3 py-1.5 border border-slate-200 shadow-sm">
                Rejected: {tabCounts.rejected}
              </span>
              <span className="inline-flex items-center rounded-md bg-white/80 backdrop-blur-sm px-3 py-1.5 border border-slate-200 shadow-sm">
                Levels: {approvalLevels}
              </span>
              <span className="inline-flex items-center rounded-md bg-white/80 backdrop-blur-sm px-3 py-1.5 border border-slate-200 shadow-sm">
                Max Hours/Day: {systemConfig?.TIMESHEET_MAX_HOURS_PER_DAY?.value || 8}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs for History Access with Count Badges */}
        <div className="bg-gradient-to-r from-white to-slate-50 rounded-2xl border border-slate-200 shadow-lg p-6 backdrop-blur-sm">
          <div className="flex space-x-8">
            {[
              { key: 'pending', label: 'Pending', count: tabCounts.pending },
              { key: 'approved', label: 'Approved', count: tabCounts.approved },
              { key: 'rejected', label: 'Rejected', count: tabCounts.rejected }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cx(
                  'py-3 px-2 border-b-3 font-medium text-sm flex items-center gap-2 transition-all rounded-t-lg',
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600 font-bold bg-gradient-to-b from-blue-50 to-white shadow-sm -mb-px'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                {tab.label}
                <span className={cx(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-sm',
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gradient-to-r from-white to-slate-50 rounded-2xl border border-slate-200 shadow-lg p-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-2">Search</label>
              <input
                className="w-full rounded-lg border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Employee code or name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Status</label>
              <select
                className="w-full rounded-lg border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">L1 Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Week Start</label>
              <input
                type="date"
                className="w-full rounded-lg border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                value={weekFilterStart}
                onChange={(e) => {
                  setWeekFilterStart(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Week End</label>
              <input
                type="date"
                className="w-full rounded-lg border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                value={weekFilterEnd}
                onChange={(e) => {
                  setWeekFilterEnd(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm transition-all"
              onClick={() => {
                setStatusFilter('ALL');
                setWeekFilterStart('');
                setWeekFilterEnd('');
                setSearch('');
                setPage(1);
              }}
            >
              Reset Filters
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm transition-all"
              onClick={list.refresh}
              disabled={list.status === 'loading'}
            >
              {list.status === 'loading' ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Table - Always Render Full Structure */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 flex items-center justify-between">
            <div className="text-lg font-bold text-slate-900">Approval Queue</div>
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md">
              Total: {total}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 border-separate border-spacing-0">
              <thead className="bg-gradient-to-r from-slate-50 to-blue-50 sticky top-0 z-10">
                <tr>
                  {tableColumns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200"
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 min-h-48">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumns.length} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-inner">
                          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">No timesheets pending approval</h3>
                        <p className="mt-2 text-sm text-slate-500">Waiting for employees to submit their timesheets.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((x) => (
                    <tr key={x.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-slate-50 transition-all duration-200">
                      {tableColumns.map((col) => (
                        <td
                          key={col.key}
                          className="px-4 py-4 text-sm text-slate-900 border-b border-slate-100 align-middle"
                        >
                          {col.render(x)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 pt-0 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-md border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              
              <div className="text-sm text-slate-600">Page {page}</div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50 disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50 disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  disabled={page * pageSize >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-medium text-slate-900">No timesheets pending approval</h3>
              <p className="mt-2 text-sm text-slate-500">Waiting for employees to submit their timesheets.</p>
            </div>
          ) : (
            filtered.map((x) => (
              <div key={x.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{formatName(x)}</div>
                    <div className="mt-1 font-mono text-xs text-slate-600">{x.employeeCode || '—'}</div>
                  </div>
                  <StatusBadge status={x.status} />
                </div>

                <div className="mt-3 text-xs text-slate-500">Week</div>
                <div className="mt-1 font-mono text-sm text-slate-900">{x.periodStart} → {x.periodEnd}</div>

                <div className="mt-3">
                  {!isSuperAdmin && (
                    <Link
                      to={`/timesheet/${x.id}`}
                      className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View
                    </Link>
                  )}

                  {canAct && isPendingRow(x) ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                        disabled={approveMutation.status === 'loading' || rejectMutation.status === 'loading'}
                        onClick={async () => {
                          await approveMutation.run({ id: x.id });
                          await list.refresh();
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:bg-rose-300"
                        disabled={approveMutation.status === 'loading' || rejectMutation.status === 'loading'}
                        onClick={() => {
                          setReason('');
                          setModal({ mode: 'reject', item: x });
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }, [canReadQueue, timesheetEnabled, list.status, list.data, list.error, filtered, tableColumns, tabCounts, total, activeTab, statusFilter, search, weekFilterStart, weekFilterEnd, page, pageSize, sortColumn, sortDirection, approvalLevels, systemConfig, canAct, approveMutation.status, rejectMutation.status]);

  return (
    <>
      <PageHeader title="Timesheet Approvals" />
      {content}

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (approveMutation.status === 'loading' || rejectMutation.status === 'loading') return;
              setModal(null);
            }}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200">
            <div className="p-5 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">Reject Timesheet</div>
              <div className="mt-1 text-xs text-slate-600">Provide a reason for rejection.</div>
            </div>
            <div className="p-5 space-y-3">
              <textarea
                className="w-full min-h-[110px] rounded-md border border-slate-300 p-3 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason..."
              />
            </div>
            <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                disabled={approveMutation.status === 'loading' || rejectMutation.status === 'loading'}
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:bg-rose-300"
                disabled={approveMutation.status === 'loading' || rejectMutation.status === 'loading' || !String(reason || '').trim()}
                onClick={async () => {
                  await rejectMutation.run({ id: modal.item.id, reason });
                  setModal(null);
                  await list.refresh();
                }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
