import React, { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { toDateOnly } from '../../shared/date/dateOnly.js';
import { getMonthDays } from '../../shared/date/monthDays.js';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function toMonthInputValue(dateString) {
  return dateString.slice(0, 7);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function initialsFromEmployee(e) {
  const fn = String(e?.firstName || '').trim();
  const ln = String(e?.lastName || '').trim();
  const a = fn ? fn[0] : '';
  const b = ln ? ln[0] : '';
  const s = (a + b).toUpperCase();
  return s || '—';
}

function statusCellClass(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'PRESENT') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'ABSENT') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (s === 'LEAVE') return 'bg-amber-50 text-amber-800 border-amber-200';
  return 'bg-white text-slate-500 border-slate-200';
}

function disabledCellClass() {
  return 'bg-slate-100 text-slate-400 border-slate-200';
}

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  if (!s) return null;
  const cls = statusCellClass(s).replace('border-', '');
  return <span className={cx('inline-flex rounded-full px-2 py-1 text-xs font-semibold', cls)}>{s}</span>;
}

export function AttendancePage() {
  const { bootstrap } = useBootstrap();
  const title = bootstrap?.ui?.screens?.attendance?.title || 'Attendance';

  const permissions = bootstrap?.rbac?.permissions || [];
  const canRead = permissions.includes('ATTENDANCE_READ');
  const canWrite = permissions.includes('ATTENDANCE_WRITE');
  const canBulk = permissions.includes('ATTENDANCE_BULK_WRITE');
  const canOverride = permissions.includes('ATTENDANCE_OVERRIDE');

  const [month, setMonth] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [view, setView] = useState('monthly');

  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeSearchDebounced, setEmployeeSearchDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setEmployeeSearchDebounced(employeeSearch);
    }, 300);
    return () => clearTimeout(t);
  }, [employeeSearch]);

  const divisions = usePagedQuery({ path: '/api/v1/governance/divisions', page: 1, pageSize: 200, enabled: true });
  const divisionsById = useMemo(() => {
    const map = {};
    for (const d of divisions.data?.items || []) map[d.id] = d;
    return map;
  }, [divisions.data]);

  const [monthState, setMonthState] = useState({ status: 'idle', data: null, error: null, refreshIndex: 0 });
  const refreshMonth = () => setMonthState((s) => ({ ...s, refreshIndex: s.refreshIndex + 1 }));

  useEffect(() => {
    if (!canRead) return;
    if (!month) return;

    let alive = true;

    async function run() {
      setMonthState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        const u = new URL('/api/v1/attendance/month', 'http://local');
        u.searchParams.set('month', month);
        if (divisionId) u.searchParams.set('divisionId', divisionId);

        const payload = await apiFetch(u.pathname + u.search);
        if (!alive) return;
        setMonthState((s) => ({ ...s, status: 'ready', data: payload, error: null }));
      } catch (err) {
        if (!alive) return;
        setMonthState((s) => ({ ...s, status: 'error', error: err }));
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [canRead, month, divisionId, monthState.refreshIndex]);

  // Initialize month from server's todayDate (authoritative, date-only)
  useEffect(() => {
    if (!canRead) return;
    if (month) return;

    let alive = true;

    async function run() {
      try {
        const u = new URL('/api/v1/attendance/month', 'http://local');
        // backend will reject missing month, so we fetch it from summary endpoint first month if needed
        // We fallback to CURRENT_DATE month by asking the server todayDate via a lightweight call
        const payload = await apiFetch('/api/v1/attendance/today');
        const todayDate = payload?.todayDate || null;
        if (!alive) return;
        if (todayDate && /^\d{4}-\d{2}-\d{2}$/.test(todayDate)) {
          setMonth(toMonthInputValue(todayDate));
        }
      } catch {
        // If server date is unavailable, keep month empty (read-only)
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [canRead, month]);

  const [summaryState, setSummaryState] = useState({ status: 'idle', data: null, error: null, refreshIndex: 0 });
  const refreshSummary = () => setSummaryState((s) => ({ ...s, refreshIndex: s.refreshIndex + 1 }));

  useEffect(() => {
    if (!canRead) return;
    if (view !== 'summary') return;

    let alive = true;

    async function run() {
      setSummaryState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        const u = new URL('/api/v1/attendance/summary', 'http://local');
        u.searchParams.set('month', month);
        if (divisionId) u.searchParams.set('divisionId', divisionId);

        const payload = await apiFetch(u.pathname + u.search);
        if (!alive) return;
        setSummaryState((s) => ({ ...s, status: 'ready', data: payload, error: null }));
      } catch (err) {
        if (!alive) return;
        setSummaryState((s) => ({ ...s, status: 'error', error: err }));
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [canRead, view, month, divisionId, summaryState.refreshIndex]);

  const isMonthClosed = Boolean(monthState.data?.isMonthClosed);
  const canEditMonth = canWrite && !isMonthClosed;

  const todayDate = monthState.data?.todayDate || null;

  const days = useMemo(() => {
    if (!month) return [];
    const [year, monthNum] = month.split('-').map(Number);
    return getMonthDays(year, monthNum - 1); // Convert to 0-indexed month
  }, [month]);

  const employees = monthState.data?.employees || [];
  const records = monthState.data?.records || [];

  const filteredEmployees = useMemo(() => {
    const q = String(employeeSearchDebounced || '').trim().toLowerCase();
    if (!q) return employees;
    return (employees || []).filter((e) => {
      const code = String(e?.employeeCode || '').toLowerCase();
      const name = `${String(e?.firstName || '').trim()} ${String(e?.lastName || '').trim()}`.trim().toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [employees, employeeSearchDebounced]);

  const filteredSummaryItems = useMemo(() => {
    const items = summaryState.data?.items || [];
    const q = String(employeeSearchDebounced || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => {
      const code = String(r?.employeeCode || '').toLowerCase();
      const name = `${String(r?.firstName || '').trim()} ${String(r?.lastName || '').trim()}`.trim().toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [summaryState.data, employeeSearchDebounced]);

  const [employeeMetaById, setEmployeeMetaById] = useState({});

  useEffect(() => {
    if (!canRead) return;

    let alive = true;

    async function run() {
      const missing = (employees || [])
        .map((e) => e.id)
        .filter((id) => id && !employeeMetaById[id]);

      if (missing.length === 0) return;

      const batch = missing.slice(0, 50);
      const results = await Promise.all(
        batch.map(async (id) => {
          try {
            const payload = await apiFetch(`/api/v1/employees/${id}`);
            const item = payload?.item || null;
            const joiningDate =
              toDateOnly(item?.joiningDate) ||
              (typeof item?.createdAt === 'string' ? toDateOnly(item.createdAt) : null);
            const exitDate = toDateOnly(item?.exitDate);
            return [id, { joiningDate, exitDate, status: item?.status || null }];
          } catch {
            return [id, { joiningDate: null, exitDate: null, status: null }];
          }
        })
      );

      if (!alive) return;

      setEmployeeMetaById((prev) => {
        const next = { ...prev };
        for (const [id, meta] of results) next[id] = meta;
        return next;
      });
    }

    run();

    return () => {
      alive = false;
    };
  }, [canRead, employees, employeeMetaById]);

  function getCellDisabledReason({ employeeId, attendanceDate }) {
    if (!canWrite) return 'You do not have permission to mark attendance';
    if (isMonthClosed) return 'Month is CLOSED';

    if (!todayDate) return 'Server date unavailable';

    // HARD RULE: only TODAY selectable by default
    if (attendanceDate !== todayDate) {
      if (attendanceDate < todayDate) return 'Past dates are not allowed';
      return 'Future dates are not allowed';
    }

    const employee = (employees || []).find((x) => x.id === employeeId);
    const joiningDate =
      toDateOnly(employee?.joiningDate) ||
      employeeMetaById[employeeId]?.joiningDate ||
      null;
    const exitDate =
      toDateOnly(employee?.exitDate) ||
      employeeMetaById[employeeId]?.exitDate ||
      null;

    // String comparison is safe for ISO dates
    if (joiningDate && attendanceDate < joiningDate) {
      return 'Attendance not allowed before employee joining date';
    }

    if (exitDate && attendanceDate > exitDate) {
      return `Employee exited on ${exitDate}`;
    }

    return null;
  }

  function isAttendanceEditable({ employeeId, attendanceDate }) {
    return !getCellDisabledReason({ employeeId, attendanceDate });
  }

  const recordMap = useMemo(() => {
    const map = new Map();
    for (const r of records) {
      const ad = toDateOnly(r.attendanceDate);
      if (!ad) continue;
      map.set(`${r.employeeId}:${ad}`, r);
    }
    return map;
  }, [records]);

  const markMutation = useMutation(async (payload) => {
    return apiFetch('/api/v1/attendance/mark', { method: 'POST', body: payload });
  });

  const bulkMutation = useMutation(async (payload) => {
    return apiFetch('/api/v1/attendance/bulk-mark', { method: 'POST', body: payload });
  });

  const [markOpen, setMarkOpen] = useState(false);
  const [markEmployee, setMarkEmployee] = useState(null);
  const [markDate, setMarkDate] = useState('');
  const [markSelectedCellDate, setMarkSelectedCellDate] = useState('');
  const [markStatus, setMarkStatus] = useState('PRESENT');
  const [markSource, setMarkSource] = useState('HR');
  const [markNote, setMarkNote] = useState('');
  const [markReason, setMarkReason] = useState('');
  const [markConfirmOpen, setMarkConfirmOpen] = useState(false);

  const openMark = (employee, dateIso) => {
    const existing = recordMap.get(`${employee.id}:${dateIso}`);
    setMarkEmployee(employee);
    setMarkDate(dateIso);
    setMarkSelectedCellDate(dateIso);
    setMarkStatus(existing?.status || 'PRESENT');
    setMarkSource(existing?.source || 'HR');
    setMarkNote(existing?.note || '');
    setMarkReason('');
    setMarkOpen(true);
  };

  const requiresConfirm = markStatus === 'ABSENT' || markStatus === 'LEAVE';

  const doSubmitMark = async () => {
    console.assert(/^\d{4}-\d{2}-\d{2}$/.test(markDate), 'Invalid attendanceDate');
    console.assert(markDate === markSelectedCellDate, 'Modal date mismatch (must submit clicked cell date)');
    const payload = {
      employeeId: markEmployee.id,
      attendanceDate: markDate,
      status: markStatus,
      source: markSource,
      note: markNote.trim() || null,
      reason: markReason.trim() || null
    };

    console.assert(payload.attendanceDate === markSelectedCellDate, 'Payload date mismatch (must submit clicked cell date)');

    await markMutation.run(payload);
    setMarkOpen(false);
    setMarkConfirmOpen(false);
    refreshMonth();
  };

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState('');
  const [bulkSource, setBulkSource] = useState('HR');
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);

  useEffect(() => {
    if (!month) {
      setBulkDate('');
      return;
    }
    const [year, monthNum] = month.split('-').map(Number);
    setBulkDate(`${year}-${String(monthNum).padStart(2, '0')}-01`);
  }, [month]);

  const openBulk = () => {
    if (!month) return;
    const dateIso = bulkDate || (() => {
      const [year, monthNum] = month.split('-').map(Number);
      return `${year}-${String(monthNum).padStart(2, '0')}-01`;
    })();
    const next = (employees || []).map((e) => {
      const existing = recordMap.get(`${e.id}:${dateIso}`);
      return {
        employeeId: e.id,
        employeeCode: e.employeeCode,
        firstName: e.firstName,
        lastName: e.lastName,
        status: existing?.status || 'PRESENT',
        note: existing?.note || '',
        reason: ''
      };
    });

    setBulkItems(next);
    setBulkResult(null);
    setBulkOpen(true);
  };

  const submitBulk = async () => {
    if (!month) return;
    console.assert(/^\d{4}-\d{2}-\d{2}$/.test(bulkDate), 'Invalid attendanceDate');
    const payload = {
      attendanceDate: bulkDate,
      source: bulkSource,
      items: bulkItems.map((x) => ({
        employeeId: x.employeeId,
        status: x.status,
        note: x.note.trim() || null,
        reason: x.reason.trim() || null
      }))
    };

    const result = await bulkMutation.run(payload);
    setBulkResult(result);
    refreshMonth();
  };

  if (!canRead) {
    return (
      <div>
        <PageHeader title={title} />
        <ForbiddenState />
      </div>
    );
  }

  if (monthState.status === 'loading' && !monthState.data) {
    return (
      <div>
        <PageHeader title={title} />
        <LoadingState />
      </div>
    );
  }

  if (monthState.status === 'error') {
    return (
      <div>
        <PageHeader title={title} />
        {monthState.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={monthState.error} />}
      </div>
    );
  }

  const monthStatus = monthState.data?.monthStatus || 'OPEN';

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title={title}
        subtitle="Monthly"
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              className={cx(
                'rounded-lg px-3 py-2 text-sm font-medium',
                view === 'monthly' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              )}
              onClick={() => setView('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={cx(
                'rounded-lg px-3 py-2 text-sm font-medium',
                view === 'summary' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              )}
              onClick={() => {
                setView('summary');
                refreshSummary();
              }}
            >
              Summary
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200">
                <div className="text-sm font-semibold text-slate-900">Controls</div>
                <div className="mt-1 text-xs text-slate-500">Month close status: {monthStatus}</div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Month</label>
                  <input
                    type="month"
                    className="mt-1 w-full rounded-md border-slate-300 text-sm"
                    value={month}
                    onChange={(e) => {
                      setMonth(e.target.value);
                      refreshMonth();
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Employee</label>
                  <input
                    className="mt-1 w-full rounded-md border-slate-300 text-sm"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search by name or code"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Division</label>
                  <select
                    className="mt-1 w-full rounded-md border-slate-300 text-sm"
                    value={divisionId}
                    onChange={(e) => {
                      setDivisionId(e.target.value);
                      refreshMonth();
                      refreshSummary();
                    }}
                    disabled={divisions.status === 'error' || (divisions.data?.items || []).length === 0}
                  >
                    <option value="">All</option>
                    {(divisions.data?.items || []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                  {divisions.status === 'error' ? <div className="mt-1 text-xs text-rose-700">Divisions unavailable.</div> : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-medium text-slate-600">Editability</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {isMonthClosed ? 'Month is CLOSED. Read-only.' : canWrite ? 'Month is OPEN. You can mark attendance.' : 'Read-only.'}
                  </div>
                </div>

                {view === 'monthly' ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                      disabled={!canBulk || isMonthClosed}
                      onClick={openBulk}
                    >
                      Bulk Mark
                    </button>
                    {!canBulk ? <div className="text-xs text-slate-500">Requires ATTENDANCE_BULK_WRITE.</div> : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9">
            {view === 'monthly' ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Monthly View</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {filteredEmployees.length} employees · {days.length} days
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
                      <span className="inline-flex h-3 w-3 rounded bg-emerald-200" /> Present
                      <span className="inline-flex h-3 w-3 rounded bg-rose-200" /> Absent
                      <span className="inline-flex h-3 w-3 rounded bg-amber-200" /> Leave
                    </div>
                  </div>
                </div>

                {filteredEmployees.length === 0 ? (
                  <div className="p-6">
                    <EmptyState title="No active employees" description="Attendance applies to ACTIVE employees only." />
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full border-separate" style={{ borderSpacing: 0 }}>
                      <thead className="sticky top-0 bg-white z-10">
                        <tr>
                          <th className="sticky left-0 z-20 bg-white border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">Employee</th>
                          {days.map((dateIso) => (
                            <th key={dateIso} className="border-b border-slate-200 px-2 py-2 text-center text-xs font-semibold text-slate-600 whitespace-nowrap">
                              {dateIso.slice(8)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmployees.map((e) => {
                          const divisionLabel = e.primaryDivisionId ? divisionsById[e.primaryDivisionId]?.code || '' : '';
                          return (
                            <tr key={e.id} className="hover:bg-slate-50">
                              <td className="sticky left-0 z-10 bg-white border-b border-slate-100 px-3 py-2">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                                    {initialsFromEmployee(e)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-900 truncate">
                                      {e.employeeCode} · {e.firstName} {e.lastName}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate">
                                      {divisionLabel ? `Division: ${divisionLabel}` : e.scope}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              {days.map((dateIso) => {
                                const rec = recordMap.get(`${e.id}:${dateIso}`);
                                const status = rec?.status || '';
                                const editable = canEditMonth && isAttendanceEditable({ employeeId: e.id, attendanceDate: dateIso });
                                const disabled = !editable;
                                const reason = getCellDisabledReason({ employeeId: e.id, attendanceDate: dateIso });
                                return (
                                  <td key={dateIso} className="border-b border-slate-100 px-2 py-2 text-center">
                                    <button
                                      type="button"
                                      className={cx(
                                        'w-12 h-9 rounded-lg border text-xs font-semibold',
                                        disabled ? disabledCellClass() : statusCellClass(status),
                                        disabled ? 'cursor-not-allowed' : 'hover:shadow-sm'
                                      )}
                                      disabled={disabled}
                                      onClick={disabled ? undefined : () => openMark(e, dateIso)}
                                      title={disabled ? reason || 'Not allowed' : status ? `${status}` : '—'}
                                    >
                                      {status ? status[0] : '—'}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-4 border-b border-slate-200">
                  <div className="text-sm font-semibold text-slate-900">Monthly Summary</div>
                  <div className="mt-1 text-xs text-slate-500">Read-only aggregation for payroll reference.</div>
                </div>

                {summaryState.status === 'loading' ? (
                  <div className="p-6">
                    <LoadingState label="Loading summary…" />
                  </div>
                ) : summaryState.status === 'error' ? (
                  <div className="p-6">
                    {summaryState.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={summaryState.error} />}
                  </div>
                ) : (summaryState.data?.items || []).length === 0 ? (
                  <div className="p-6">
                    <EmptyState title="No data" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Employee</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Present</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Absent</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Leave</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Working Days</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredSummaryItems.map((r) => (
                          <tr key={r.employeeId}>
                            <td className="px-4 py-3">
                              <div className="text-sm font-semibold text-slate-900">
                                {r.employeeCode} · {r.firstName} {r.lastName}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-slate-700">{r.presentDays}</td>
                            <td className="px-4 py-3 text-right text-sm text-slate-700">{r.absentDays}</td>
                            <td className="px-4 py-3 text-right text-sm text-slate-700">{r.leaveDays}</td>
                            <td className="px-4 py-3 text-right text-sm text-slate-700">{r.totalWorkingDays}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {markOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (markMutation.status === 'loading') return;
              setMarkOpen(false);
              setMarkConfirmOpen(false);
            }}
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">Mark Attendance</div>
            <div className="mt-1 text-sm text-slate-600">
              {markEmployee ? `${markEmployee.employeeCode} · ${markEmployee.firstName} ${markEmployee.lastName}` : '—'}
            </div>
            <div className="mt-3 text-xs text-slate-500">Date: {markDate}</div>

            {isMonthClosed ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Month is CLOSED. Read-only.</div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  className="mt-1 w-full rounded-md border-slate-300 text-sm"
                  value={markStatus}
                  onChange={(e) => setMarkStatus(e.target.value)}
                  disabled={isMonthClosed}
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="LEAVE">LEAVE</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Source</label>
                <select
                  className="mt-1 w-full rounded-md border-slate-300 text-sm"
                  value={markSource}
                  onChange={(e) => setMarkSource(e.target.value)}
                  disabled={isMonthClosed}
                >
                  <option value="HR">HR</option>
                  <option value="SYSTEM">SYSTEM</option>
                  <option value="SELF">SELF</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Note (optional)</label>
                <textarea
                  className="mt-1 w-full h-24 rounded-md border-slate-300 text-sm"
                  value={markNote}
                  onChange={(e) => setMarkNote(e.target.value)}
                  disabled={isMonthClosed}
                />
              </div>

              {canOverride ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Reason (required for override)</label>
                  <input
                    className="mt-1 w-full rounded-md border-slate-300 text-sm"
                    value={markReason}
                    onChange={(e) => setMarkReason(e.target.value)}
                    disabled={isMonthClosed}
                    placeholder="Required when updating an existing record"
                  />
                </div>
              ) : null}
            </div>

            {markMutation.status === 'error' ? (
              <div className="mt-3">
                <ErrorState error={markMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={markMutation.status === 'loading'}
                onClick={() => {
                  setMarkOpen(false);
                  setMarkConfirmOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={markMutation.status === 'loading' || isMonthClosed || !markEmployee || !markDate}
                onClick={() => {
                  if (requiresConfirm) {
                    setMarkConfirmOpen(true);
                    return;
                  }
                  doSubmitMark();
                }}
              >
                {markMutation.status === 'loading' ? 'Saving…' : 'Confirm'}
              </button>
            </div>

            {markConfirmOpen ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="text-sm font-semibold text-amber-900">Confirm {markStatus}</div>
                <div className="mt-1 text-xs text-amber-900">This will mark the employee as {markStatus} for {markDate}.</div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900 hover:bg-amber-50"
                    onClick={() => setMarkConfirmOpen(false)}
                    disabled={markMutation.status === 'loading'}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white disabled:bg-amber-300"
                    onClick={doSubmitMark}
                    disabled={markMutation.status === 'loading'}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {bulkOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (bulkMutation.status === 'loading') return;
              setBulkOpen(false);
            }}
          />
          <div className="relative w-full max-w-4xl rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-900">Bulk Mark Attendance</div>
                <div className="mt-1 text-sm text-slate-600">Max batch size: 500</div>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => setBulkOpen(false)}
                disabled={bulkMutation.status === 'loading'}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border-slate-300 text-sm"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  disabled={isMonthClosed}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Source</label>
                <select
                  className="mt-1 w-full rounded-md border-slate-300 text-sm"
                  value={bulkSource}
                  onChange={(e) => setBulkSource(e.target.value)}
                  disabled={isMonthClosed}
                >
                  <option value="HR">HR</option>
                  <option value="SYSTEM">SYSTEM</option>
                  <option value="SELF">SELF</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                  disabled={bulkMutation.status === 'loading' || isMonthClosed}
                  onClick={submitBulk}
                >
                  {bulkMutation.status === 'loading' ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>

            {isMonthClosed ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Month is CLOSED. Read-only.</div>
            ) : null}

            {bulkMutation.status === 'error' ? (
              <div className="mt-3">
                <ErrorState error={bulkMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 overflow-auto border border-slate-200 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Employee</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Note</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Reason (override)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {bulkItems.map((x) => (
                    <tr key={x.employeeId}>
                      <td className="px-3 py-2 text-sm text-slate-900">
                        <div className="font-semibold">{x.employeeCode}</div>
                        <div className="text-xs text-slate-500">
                          {x.firstName} {x.lastName}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="w-full rounded-md border-slate-300 text-sm"
                          value={x.status}
                          onChange={(e) => {
                            const v = e.target.value;
                            setBulkItems((prev) => prev.map((p) => (p.employeeId === x.employeeId ? { ...p, status: v } : p)));
                          }}
                          disabled={isMonthClosed}
                        >
                          <option value="PRESENT">PRESENT</option>
                          <option value="ABSENT">ABSENT</option>
                          <option value="LEAVE">LEAVE</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="w-full rounded-md border-slate-300 text-sm"
                          value={x.note}
                          onChange={(e) => {
                            const v = e.target.value;
                            setBulkItems((prev) => prev.map((p) => (p.employeeId === x.employeeId ? { ...p, note: v } : p)));
                          }}
                          disabled={isMonthClosed}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="w-full rounded-md border-slate-300 text-sm"
                          value={x.reason}
                          onChange={(e) => {
                            const v = e.target.value;
                            setBulkItems((prev) => prev.map((p) => (p.employeeId === x.employeeId ? { ...p, reason: v } : p)));
                          }}
                          disabled={isMonthClosed}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {bulkResult ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-semibold text-slate-900">Result</div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                    <div className="text-xs font-medium text-slate-500">Created</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{(bulkResult.items || []).filter((i) => i.outcome === 'CREATED').length}</div>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                    <div className="text-xs font-medium text-slate-500">Updated</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{(bulkResult.items || []).filter((i) => i.outcome === 'UPDATED').length}</div>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                    <div className="text-xs font-medium text-slate-500">Failed</div>
                    <div className="mt-1 text-lg font-semibold text-rose-700">{(bulkResult.items || []).filter((i) => i.outcome === 'FAILED').length}</div>
                  </div>
                </div>

                {(bulkResult.items || []).filter((i) => i.outcome === 'FAILED').length > 0 ? (
                  <div className="mt-3 overflow-auto max-h-56">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Employee</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(bulkResult.items || [])
                          .filter((i) => i.outcome === 'FAILED')
                          .map((i) => (
                            <tr key={`${i.employeeId}:${i.attendanceDate}`}>
                              <td className="px-3 py-2 text-xs font-mono text-slate-700">{String(i.employeeId).slice(0, 8)}…</td>
                              <td className="px-3 py-2 text-xs text-rose-700">{i.error || 'Failed'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
