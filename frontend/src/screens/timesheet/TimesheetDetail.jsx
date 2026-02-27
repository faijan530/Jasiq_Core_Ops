import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
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
  if (s === 'REVISION_REQUIRED') return 'bg-amber-50 text-amber-800';
  if (s === 'DRAFT') return 'bg-slate-100 text-slate-800';
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

function fmtDt(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function buildTabs(tab, setTab) {
  const TabButton = ({ id, label }) => {
    const active = tab === id;
    return (
      <button
        type="button"
        className={cx(
          'rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
          active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        )}
        onClick={() => setTab(id)}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TabButton id="worklogs" label="Worklogs" />
      <TabButton id="timeline" label="Approval Timeline" />
      <TabButton id="audit" label="Audit Trail" />
    </div>
  );
}

export function TimesheetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];
  const roles = bootstrap?.rbac?.roles || [];
  const canRead =
    permissions.includes('TIMESHEET_READ') ||
    permissions.includes('TIMESHEET_APPROVAL_QUEUE_READ') ||
    permissions.includes('TIMESHEET_APPROVE_L1') ||
    permissions.includes('TIMESHEET_APPROVE_L2');
  const canSubmit = permissions.includes('TIMESHEET_SUBMIT');
  const canApproveL1 = permissions.includes('TIMESHEET_APPROVE_L1');
  const canApproveL2 = permissions.includes('TIMESHEET_APPROVE_L2');
  const canWorklogWrite = permissions.includes('TIMESHEET_WORKLOG_WRITE');
  const canReadMonthClose = permissions.includes('GOV_MONTH_CLOSE_READ');
  const canReadAudit = permissions.includes('GOV_AUDIT_READ');
  const isSuperAdmin = roles.includes('SUPER_ADMIN');
  const isManager = roles.includes('MANAGER') || roles.includes('SUPERADMIN') || roles.includes('FOUNDER');

  const systemConfig = bootstrap?.systemConfig || {};
  const features = bootstrap?.features?.flags || {};

  const timesheetEnabled = isTruthyConfig(systemConfig?.TIMESHEET_ENABLED?.value ?? systemConfig?.TIMESHEET_ENABLED);
  const monthCloseEnabled = Boolean(features?.MONTH_CLOSE_ENABLED);

  const [tab, setTab] = useState('worklogs');

  const [state, setState] = useState({ status: 'idle', data: null, error: null, refreshIndex: 0 });
  const refresh = () => setState((s) => ({ ...s, refreshIndex: s.refreshIndex + 1 }));

  useEffect(() => {
    setTab('worklogs');
  }, [id]);

  useEffect(() => {
    if (!canRead) return;
    if (!timesheetEnabled) return;
    if (!id) return;

    let alive = true;

    async function run() {
      setState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        const payload = await apiFetch(`/api/v1/timesheets/${id}`);
        if (!alive) return;
        setState((s) => ({ ...s, status: 'ready', data: payload, error: null }));
      } catch (err) {
        if (!alive) return;
        setState((s) => ({ ...s, status: 'error', error: err }));
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [canRead, id, state.refreshIndex, timesheetEnabled]);

  const header = state.data?.header || null;
  const worklogs = state.data?.worklogs || [];

  const monthKey = header?.periodEnd ? toMonthEndIso(header.periodEnd) : null;

  const monthClose = usePagedQuery({
    path: '/api/v1/governance/month-close',
    page: 1,
    pageSize: 200,
    enabled: monthCloseEnabled && canReadMonthClose && Boolean(monthKey)
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

  const isMonthClosed = Boolean(monthKey && closedMonthSet.has(monthKey));

  const auditList = usePagedQuery({
    path: header?.id
      ? (() => {
          const u = new URL('/api/v1/governance/audit', 'http://local');
          u.searchParams.set('entityType', 'TIMESHEET');
          u.searchParams.set('entityId', header.id);
          return u.pathname + u.search;
        })()
      : '/api/v1/governance/audit',
    page: 1,
    pageSize: 50,
    enabled: tab === 'audit' && canReadAudit && Boolean(header?.id)
  });

  const upsertMutation = useMutation(async (payload) => {
    return apiFetch('/api/v1/timesheets/worklog', { method: 'POST', body: payload });
  });

  const submitMutation = useMutation(async () => {
    return apiFetch(`/api/v1/timesheets/${id}/submit`, { method: 'POST', body: {} });
  });

  const approveMutation = useMutation(async () => {
    return apiFetch(`/api/v1/timesheets/${id}/approve`, { method: 'POST', body: {} });
  });

  const rejectMutation = useMutation(async ({ reason }) => {
    return apiFetch(`/api/v1/timesheets/${id}/reject`, { method: 'POST', body: { reason } });
  });

  const revisionMutation = useMutation(async ({ reason }) => {
    return apiFetch(`/api/v1/timesheets/${id}/request-revision`, { method: 'POST', body: { reason } });
  });

  const [newDate, setNewDate] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newHours, setNewHours] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [decisionReason, setDecisionReason] = useState('');

  const groupedWorklogs = useMemo(() => {
    const map = new Map();
    for (const wl of worklogs) {
      const date = String(wl.workDate || '').slice(0, 10);
      if (!date) continue;
      if (!map.has(date)) map.set(date, []);
      map.get(date).push(wl);
    }

    const out = Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, items]) => {
        const sorted = items.slice().sort((x, y) => (String(x.updatedAt || '') < String(y.updatedAt || '') ? 1 : -1));
        const totalHours = sorted.reduce((sum, x) => sum + (Number(x.hours) || 0), 0);
        return { date, items: sorted, totalHours };
      });

    return out;
  }, [worklogs]);

  const canEditWorklogs = Boolean(
    header &&
      String(header.employeeId) === String(bootstrap?.user?.id) &&
      canWorklogWrite &&
      !isMonthClosed &&
      String(header.status || '').toUpperCase() !== 'SUBMITTED' &&
      String(header.status || '').toUpperCase() !== 'APPROVED' &&
      !isSuperAdmin
  );

  const canShowApprove = Boolean((canApproveL1 || canApproveL2) && header && String(header.status || '').toUpperCase() === 'SUBMITTED' && !isMonthClosed && !isSuperAdmin);

  const canShowSubmit = Boolean(canSubmit && header && String(header.status || '').toUpperCase() === 'DRAFT' && !isMonthClosed && !isSuperAdmin);

  const backPath = permissions.includes('TIMESHEET_APPROVAL_QUEUE_READ') ? '/timesheet/approvals' : '/timesheet/my';

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

    if (state.status === 'loading' && !state.data) return <LoadingState />;

    if (state.status === 'error') {
      return state.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={state.error} />;
    }

    if (!header) return <EmptyState title="Timesheet not found" />;

    return (
      <div className="space-y-4">
        {isMonthClosed ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-semibold text-amber-900">Month is CLOSED</div>
            <div className="mt-1 text-sm text-amber-800">This timesheet falls within a closed payroll month and is read-only.</div>
          </div>
        ) : null}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Week</div>
              <div className="mt-1 font-mono text-sm text-slate-800">{header.periodStart} → {header.periodEnd}</div>
              <div className="mt-1 text-xs text-slate-500">Timesheet ID: <span className="font-mono">{String(header.id).slice(0, 12)}…</span></div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={header.status} />
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={refresh}
                disabled={state.status === 'loading'}
              >
                {state.status === 'loading' ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="mt-4">{buildTabs(tab, setTab)}</div>
        </div>

        {tab === 'worklogs' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Worklogs</div>
                <div className="mt-1 text-xs text-slate-500">{worklogs.length} entries</div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {canEditWorklogs ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-900">Add Worklog</div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600">Date</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-md border-slate-300 text-sm"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600">Task</label>
                      <input
                        className="mt-1 w-full rounded-md border-slate-300 text-sm"
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder="e.g., Client support"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">Hours</label>
                      <input
                        type="number"
                        step="0.25"
                        className="mt-1 w-full rounded-md border-slate-300 text-sm"
                        value={newHours}
                        onChange={(e) => setNewHours(e.target.value)}
                        placeholder="8"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-slate-600">Description (optional)</label>
                      <input
                        className="mt-1 w-full rounded-md border-slate-300 text-sm"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Short note"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row items-center justify-end gap-2">
                    <button
                      type="button"
                      className="w-full sm:w-auto rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                      disabled={
                        upsertMutation.status === 'loading' ||
                        !newDate ||
                        !newTask.trim() ||
                        !newHours ||
                        !header
                      }
                      onClick={async () => {
                        const hours = Number(newHours);
                        await upsertMutation.run({
                          employeeId: header.employeeId,
                          workDate: newDate,
                          task: newTask.trim(),
                          hours,
                          description: newDesc.trim() || null,
                          projectId: null
                        });
                        setNewTask('');
                        setNewHours('');
                        setNewDesc('');
                        refresh();
                      }}
                    >
                      {upsertMutation.status === 'loading' ? 'Saving…' : 'Add'}
                    </button>
                  </div>

                  {upsertMutation.status === 'error' ? (
                    <div className="mt-3">
                      <ErrorState error={upsertMutation.error} />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {groupedWorklogs.length === 0 ? (
                <EmptyState title="No worklogs" description="This timesheet has no worklogs." />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Task</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {groupedWorklogs.map((g) => (
                        <React.Fragment key={g.date}>
                          {g.items.map((wl, idx) => (
                            <tr key={`${g.date}-${wl.id}`} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm font-mono text-slate-800">{idx === 0 ? g.date : ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{wl.task || '—'}</td>
                              <td className="px-4 py-3 text-sm text-slate-800 text-right">{wl.hours ?? '—'}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50">
                            <td className="px-4 py-2 text-xs text-slate-500" />
                            <td className="px-4 py-2 text-xs font-semibold text-slate-600">Total</td>
                            <td className="px-4 py-2 text-xs font-semibold text-slate-800 text-right">{g.totalHours}</td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {canShowSubmit ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Submit</div>
                  <div className="mt-1 text-sm text-slate-600">Submit this timesheet for approval.</div>
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                      disabled={submitMutation.status === 'loading'}
                      onClick={async () => {
                        await submitMutation.run();
                        refresh();
                      }}
                    >
                      {submitMutation.status === 'loading' ? 'Submitting…' : 'Submit'}
                    </button>
                  </div>
                  {submitMutation.status === 'error' ? (
                    <div className="mt-3">
                      <ErrorState error={submitMutation.error} />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {canShowApprove ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Approval Actions</div>
                  <div className="mt-1 text-sm text-slate-600">Approve, reject, or request revision.</div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-600">Reason (required for reject / revision)</label>
                    <textarea
                      className="mt-1 w-full h-24 rounded-md border-slate-300 text-sm"
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      placeholder="Explain your decision"
                    />
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row items-center justify-end gap-2">
                    <button
                      type="button"
                      className="w-full sm:w-auto rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                      disabled={revisionMutation.status === 'loading' || !decisionReason.trim()}
                      onClick={async () => {
                        await revisionMutation.run({ reason: decisionReason.trim() });
                        setDecisionReason('');
                        refresh();
                      }}
                    >
                      {revisionMutation.status === 'loading' ? 'Sending…' : 'Request Revision'}
                    </button>
                    <button
                      type="button"
                      className="w-full sm:w-auto rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100 disabled:bg-rose-50"
                      disabled={rejectMutation.status === 'loading' || !decisionReason.trim()}
                      onClick={async () => {
                        await rejectMutation.run({ reason: decisionReason.trim() });
                        setDecisionReason('');
                        refresh();
                      }}
                    >
                      {rejectMutation.status === 'loading' ? 'Rejecting…' : 'Reject'}
                    </button>
                    <button
                      type="button"
                      className="w-full sm:w-auto rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                      disabled={approveMutation.status === 'loading'}
                      onClick={async () => {
                        await approveMutation.run();
                        refresh();
                      }}
                    >
                      {approveMutation.status === 'loading' ? 'Approving…' : 'Approve'}
                    </button>
                  </div>

                  {approveMutation.status === 'error' ? (
                    <div className="mt-3">
                      <ErrorState error={approveMutation.error} />
                    </div>
                  ) : null}
                  {rejectMutation.status === 'error' ? (
                    <div className="mt-3">
                      <ErrorState error={rejectMutation.error} />
                    </div>
                  ) : null}
                  {revisionMutation.status === 'error' ? (
                    <div className="mt-3">
                      <ErrorState error={revisionMutation.error} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === 'timeline' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="text-sm font-semibold text-slate-900">Approval Timeline</div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Submitted</div>
                <div className="mt-1 text-slate-800">{fmtDt(header.submittedAt)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Approved L1</div>
                <div className="mt-1 text-slate-800">{fmtDt(header.approvedL1At)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Approved L2</div>
                <div className="mt-1 text-slate-800">{fmtDt(header.approvedL2At)}</div>
              </div>
            </div>

            {header.rejectedAt ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
                <div className="text-sm font-semibold text-rose-900">Rejected</div>
                <div className="mt-1 text-sm text-rose-800">{fmtDt(header.rejectedAt)}</div>
                {header.rejectedReason ? <div className="mt-1 text-sm text-rose-800">Reason: {header.rejectedReason}</div> : null}
              </div>
            ) : null}

            {header.revisionRequestedAt ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="text-sm font-semibold text-amber-900">Revision Requested</div>
                <div className="mt-1 text-sm text-amber-800">{fmtDt(header.revisionRequestedAt)}</div>
                {header.revisionRequestedReason ? <div className="mt-1 text-sm text-amber-800">Reason: {header.revisionRequestedReason}</div> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'audit' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Audit Trail</div>
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={auditList.refresh}
                disabled={auditList.status === 'loading'}
              >
                Refresh
              </button>
            </div>
            <div className="p-4">
              {auditList.status === 'loading' && !auditList.data ? (
                <LoadingState label="Loading audit logs…" />
              ) : auditList.status === 'error' ? (
                auditList.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={auditList.error} />
              ) : (auditList.data?.items || []).length === 0 ? (
                <EmptyState title="No audit logs" />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">At</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Actor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(auditList.data?.items || []).map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-700">{fmtDt(a.createdAt)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">{a.action || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 font-mono">{a.actorId || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{a.reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  }, [
    auditList,
    canEditWorklogs,
    canRead,
    canShowApprove,
    canShowSubmit,
    decisionReason,
    groupedWorklogs,
    header,
    isMonthClosed,
    refresh,
    state,
    submitMutation,
    tab,
    timesheetEnabled,
    upsertMutation,
    worklogs.length,
    newDate,
    newDesc,
    newHours,
    newTask,
    approveMutation,
    rejectMutation,
    revisionMutation
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            <Link to={backPath} className="hover:text-slate-700 hover:underline">Timesheet</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-600">Detail</span>
          </div>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(backPath);
              }
            }}
          >
            Back
          </button>
        </div>
      </div>

      <PageHeader title="Timesheet Detail" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mt-4">{content}</div>
      </div>
    </div>
  );
}
