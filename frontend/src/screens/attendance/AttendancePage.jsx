import React, { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { toDateOnly, getCurrentDateInIST, getCurrentMonthInIST, formatDateInIST } from '../../shared/date/dateOnly.js';
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
  const canRead = permissions.includes('ATTENDANCE_READ') || permissions.includes('ATTENDANCE_VIEW_TEAM') || permissions.includes('ATTENDANCE_VIEW_ALL') || permissions.includes('ATTENDANCE_CORRECT');
  const canWriteMark = permissions.includes('ATTENDANCE_WRITE') || permissions.includes('SYSTEM_FULL_ACCESS');
  const canCorrect = permissions.includes('ATTENDANCE_CORRECT') || permissions.includes('SYSTEM_FULL_ACCESS');
  const canWrite = canWriteMark || canCorrect;

  const isHrCorrectOnly = canCorrect && !canWriteMark;

  const canOverride =
    permissions.includes('ATTENDANCE_OVERRIDE') ||
    permissions.includes('ATTENDANCE_WRITE') ||
    permissions.includes('ATTENDANCE_CORRECT') ||
    permissions.includes('LEAVE_MONTH_CLOSE_OVERRIDE') ||
    permissions.includes('SYSTEM_FULL_ACCESS');

  const canBulk =
    permissions.includes('ATTENDANCE_BULK_WRITE') ||
    permissions.includes('ATTENDANCE_WRITE') ||
    permissions.includes('SYSTEM_FULL_ACCESS');

  // Permission-based mode determination
  const isSuperAdmin = permissions.includes('SYSTEM_FULL_ACCESS');
  const isHR = permissions.includes('ATTENDANCE_WRITE') || permissions.includes('ATTENDANCE_CORRECT') || permissions.includes('ATTENDANCE_VIEW_TEAM') || permissions.includes('ATTENDANCE_VIEW_ALL');
  
  const mode = isSuperAdmin
    ? 'admin'
    : isHR
    ? 'hr'
    : 'readonly';

  const [month, setMonth] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [view, setView] = useState('monthly');
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState('');
  const [bulkStatus, setBulkStatus] = useState('P');
  const [bulkDivision, setBulkDivision] = useState('ALL');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Helper function to normalize status codes
  function normalizeStatus(code) {
    if (code === "P") return "PRESENT";
    if (code === "A") return "ABSENT";
    if (code === "L") return "LEAVE";
    return code;
  }

  // Helper function to normalize backend status to display format
  function normalizeStatusFromBackend(status) {
    if (!status) return null;
    const s = status.toUpperCase();
    if (s === 'PRESENT') return 'P';
    if (s === 'ABSENT') return 'A';
    if (s === 'LEAVE') return 'L';
    return s;
  }

  // Simple notification helper
  function showNotification(message, type = 'info') {
    // Create a simple notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  useEffect(() => {
    setView('monthly');
  }, [mode]);

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
        // Determine which endpoint to use based on permissions
        const endpoint = permissions.includes('ATTENDANCE_CORRECT') 
          ? '/api/v1/attendance/hr-month'
          : '/api/v1/attendance/month';
        
        const u = new URL(endpoint, 'http://local');
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
        // Determine which endpoint to use based on permissions
        const endpoint = permissions.includes('ATTENDANCE_CORRECT') 
          ? '/api/v1/attendance/hr-month'
          : '/api/v1/attendance/month';
        
        const u = new URL(endpoint, 'http://local');
        // backend will reject missing month, so we fetch it from summary endpoint first month if needed
        // We fallback to CURRENT_DATE month by asking the server todayDate via a lightweight call
        // Determine which endpoint to use based on permissions
        const todayEndpoint = permissions.includes('ATTENDANCE_CORRECT') 
          ? '/api/v1/attendance/hr-today'
          : '/api/v1/attendance/today';
        
        const payload = await apiFetch(todayEndpoint);
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
  const canEditMonth = canWrite && (!isMonthClosed || canOverride);

  const todayDate = monthState.data?.todayDate || null;
  
  // Today detection
  const today = getCurrentDateInIST();
  const todayISO = today;
  const todayDay = parseInt(today.split('-')[2], 10);

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
    if (isMonthClosed && !canOverride) return 'Month is CLOSED';

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
      return `Employee joined on ${joiningDate}`;
    }

    if (exitDate && attendanceDate > exitDate) {
      return `Employee exited on ${exitDate}`;
    }

    return null;
  }

  function isAttendanceEditable({ employeeId, attendanceDate }) {
    return getCellDisabledReason({ employeeId, attendanceDate }) === null;
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

  const getFriendlyErrorMessage = (error) => {
  const message = error?.response?.data?.message || error?.message || '';
  
  if (message.includes('Invalid attendance source')) {
    return "Unable to update attendance. Please try again.";
  }
  
  if (message.includes('newStatus') || message.includes('status')) {
    return "Please select a valid attendance status.";
  }
  
  if (message.includes('Cannot mark attendance for future date')) {
    return "You cannot mark attendance for a future date.";
  }
  
  if (message.includes('Month is closed') || message.includes('Attendance cannot be dealt')) {
    return "This month is closed. Attendance cannot be modified.";
  }
  
  if (message.includes('Employee not found')) {
    return "Employee not found. Please select a valid employee.";
  }
  
  if (message.includes('Past dates') || message.includes('Future dates')) {
    return "Selected date cannot be modified. Please check date restrictions.";
  }
  
  return "Attendance update failed";
};

  const markMutation = useMutation(async (payload) => {
    return apiFetch('/api/v1/attendance/mark', {
      method: 'POST',
      body: payload
    });
  });

  const overrideMutation = useMutation(async (payload) => {
    return apiFetch('/api/v1/attendance/override', {
      method: 'POST',
      body: payload
    });
  });

  const [markOpen, setMarkOpen] = useState(false);
  const [markEmployee, setMarkEmployee] = useState(null);
  const [markDate, setMarkDate] = useState('');
  const [markSelectedCellDate, setMarkSelectedCellDate] = useState('');
  const [markOldStatus, setMarkOldStatus] = useState('');
  const [markStatus, setMarkStatus] = useState('PRESENT');
  const [markReason, setMarkReason] = useState('');

  const openMark = (employee, dateIso) => {
    // SAFETY: Prevent opening modal for future dates
    const cellDate = new Date(dateIso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    cellDate.setHours(0, 0, 0, 0);
    
    if (cellDate > today) {
      console.log('[Attendance Debug] Blocked attempt to open future date:', dateIso);
      return;
    }
    
    const existing = recordMap.get(`${employee.id}:${dateIso}`);
    setMarkEmployee(employee);
    setMarkDate(dateIso);
    setMarkSelectedCellDate(dateIso);
    setMarkOldStatus(existing?.status || '');
    setMarkStatus(existing?.status || 'PRESENT');
    setMarkReason('');
    setMarkOpen(true);
  };

  const handleBulkSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!bulkDate) return showNotification("Select date", 'error');
    if (bulkLoading) return;

    // Client-side validation: Check past date without override
    const todayIso = getCurrentDateInIST();
    
    if (!overrideEnabled && bulkDate < todayIso) {
      showNotification("Past dates are not allowed", 'error');
      return; // Early return - no API call
    }

    // Validate reason when override is enabled
    if (overrideEnabled && !overrideReason.trim()) {
      showNotification("Reason is required for override", 'error');
      return;
    }

    setBulkLoading(true);

    try {
      // Get all employees for bulk operation
      const employees = monthState.data?.employees || [];
      
      const response = await apiFetch('/api/v1/attendance/bulk-mark', {
        method: 'POST',
        body: {
          attendanceDate: bulkDate,
          source: "HR",
          items: employees.map(e => ({
            employeeId: e.id,
            status: normalizeStatus(bulkStatus),
            reason: overrideEnabled ? overrideReason.trim() : undefined
          }))
        }
      });

      // Check response status - only show success if status === 200
      if (response.status !== 200) {
        throw new Error(response.data?.message || 'Bulk attendance failed');
      }

      // Extract result array safely
      const results = Array.isArray(response.data?.items)
        ? response.data.items
        : Array.isArray(response.data)
        ? response.data
        : [];

      // Separate success and failure
      const updated = results.filter(r => r.outcome === "UPDATED" || r.outcome === "CREATED");
      const failed = results.filter(r => r.outcome === "FAILED");

      // Show appropriate toast only for successful responses
      if (failed.length === 0) {
        showNotification("Attendance updated successfully", 'success');
      } else {
        const message = `${updated.length} updated, ${failed.length} failed`;
        showNotification(message, 'error');
        
        // Log failed employees for debugging
        console.log('Failed bulk updates:', failed);
      }

      // Close modal and refresh only on successful response
      setBulkModalOpen(false);
      
      // Refetch month data with cache busting
      await refetchMonth();
      
    } catch (err) {
      // Extract error message from response or fallback
      const message = 
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        "Attendance update failed";
      
      showNotification(message, 'error');
      
      // Keep modal open on error - do not close or refresh
    } finally {
      setBulkLoading(false);
    }
  };

  const refetchMonth = async () => {
    try {
      // Force refresh with cache busting
      const currentMonth = month || getCurrentMonthInIST();
      
      // Reset state first to force re-render
      setMonthState((s) => ({ ...s, data: null }));
      
      // Determine which endpoint to use based on permissions
      const endpoint = permissions.includes('ATTENDANCE_CORRECT') 
        ? `/api/v1/attendance/hr-month?month=${currentMonth}&t=${Date.now()}`
        : `/api/v1/attendance/month?month=${currentMonth}&t=${Date.now()}`;

      // Fetch fresh data with cache busting
      const payload = await apiFetch(endpoint);
      
      // Fully replace month state (not merge)
      setMonthState((s) => ({ ...s, status: 'ready', data: payload, error: null }));
      
      // Trigger summary refresh
      refreshSummary();
    } catch (err) {
      console.error('Failed to refetch month data:', err);
      // Keep existing state on error
    }
  };

  const validateOverrideInput = (employee, date, status, reason) => {
    // Check if status is selected
    if (!status || status === '') {
      return "Please select a status.";
    }
    
    // Check for future date
    const today = getCurrentDateInIST();
    if (date > today) {
      return "Future dates cannot be modified.";
    }
    
    // Check if employee is valid
    if (!employee || !employee.id) {
      return "Please select a valid employee.";
    }
    
    // Check past date logic
    if (date < today) {
      // Past date requires override mode
      if (!overrideEnabled) {
        return "Past dates require override mode";
      }
      
      // Override mode requires reason (except for SUPER_ADMIN first-time marking)
      if (!reason || reason.trim() === '') {
        // SUPER_ADMIN doesn't need reason for override
        if (!permissions.includes('SYSTEM_FULL_ACCESS')) {
          return "Reason is required for override.";
        }
      }
    }
    
    // For today's date, SUPER_ADMIN doesn't need reason
    if (date === today && permissions.includes('SYSTEM_FULL_ACCESS')) {
      // Reason is optional for SUPER_ADMIN on today's date
      return null;
    }
    
    return null; // No validation errors
  };

  const doSubmitMark = async () => {
    const validationError = validateOverrideInput(markEmployee, markSelectedCellDate, markStatus, markReason);
    if (validationError) {
      showNotification(validationError, 'error');
      return;
    }

    const payloadMark = {
      employeeId: markEmployee.id,
      attendanceDate: markSelectedCellDate,
      status: markStatus,
      source: 'HR',
      reason: markReason.trim() || undefined
    };

    const payloadOverride = {
      employeeId: markEmployee.id,
      attendanceDate: markSelectedCellDate,
      newStatus: markStatus,
      reason: markReason.trim() || undefined
    };

    console.assert(payloadMark.attendanceDate === markSelectedCellDate, 'Payload date mismatch (must submit clicked cell date)');

    try {
      if (isHrCorrectOnly) {
        await overrideMutation.run(payloadOverride);
      } else {
        await markMutation.run(payloadMark);
      }
      setMarkOpen(false);
      refreshMonth();
      showNotification("Attendance updated successfully", 'success');
      
      // Trigger comprehensive data refresh after successful override
      setTimeout(() => {
        console.log('[Attendance Page] Emitting attendance update event');
        
        // Refresh divisions data
        divisions.refresh?.();
        
        // Emit custom event for dashboard updates
        const event = new CustomEvent('attendanceDataUpdated', {
          detail: {
            employeeId: markEmployee.id,
            attendanceDate: markSelectedCellDate,
            newStatus: markStatus,
            oldStatus: markOldStatus,
            isOverride: overrideEnabled && canOverride
          }
        });
        window.dispatchEvent(event);
      }, 100);
    } catch (error) {
      console.error('[Attendance Page] Override failed:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      showNotification(friendlyMessage, 'error');
    }
  };

  if (monthState.status === 'loading' && !monthState.data) {
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
          canWrite ? (
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
                Overview
              </button>
            </div>
          ) : null
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
                    {canEditMonth
                  ? 'Month is OPEN. Attendance is editable.'
                  : 'Read-only.'}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-xs font-semibold text-slate-900">Attendance</div>
                  <div className="mt-2 space-y-2 text-xs text-slate-600">
                    <div>Attendance is recorded as factual daily status.</div>
                    <div>Leave days are auto-synced and read-only.</div>
                    <div>Locked months cannot be edited.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9">
            {view === 'monthly' ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {canWrite
                        ? 'Attendance Overview'
                        : 'Attendance'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {filteredEmployees.length} employees · {days.length} days
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isMonthClosed ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
                        <span aria-hidden>🔒</span>
                        Month locked
                      </span>
                    ) : null}
                    
                    {/* Override Toggle Button */}
                    {canOverride && (
                      <button 
                        onClick={() => setOverrideEnabled(prev => !prev)}
                        className={cx(
                          "rounded-lg border px-3 py-1 text-xs font-medium",
                          overrideEnabled 
                            ? "border-blue-300 bg-blue-50 text-blue-700" 
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {overrideEnabled ? "Override ON" : "Override Mode"}
                      </button>
                    )}
                    
                    {/* Bulk Attendance Button */}
                    {canBulk && (
                      <button 
                        onClick={() => setBulkModalOpen(true)}
                        className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Bulk Attendance
                      </button>
                    )}
                    
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
                          {days.map((dateIso) => {
                            const day = parseInt(dateIso.slice(8));
                            const isToday = day === todayDay;
                            return (
                              <th 
                                key={dateIso} 
                                className={cx(
                                  'border-b px-2 py-2 text-center text-xs font-semibold whitespace-nowrap',
                                  isToday ? 'bg-blue-50 border-b-2 border-b-blue-400 text-blue-900' : 'border-slate-200 text-slate-600'
                                )}
                              >
                                {dateIso.slice(8)}
                              </th>
                            );
                          })}
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
                                const backendStatus = rec?.status || '';
                                const displayStatus = normalizeStatusFromBackend(backendStatus);
                                const day = parseInt(dateIso.slice(8));
                                const isToday = dateIso === todayISO;
                                
                                // Edit logic
                                const cellDate = new Date(dateIso);
                                const isFuture = cellDate > today;
                                
                                let editable = false;

                                // HR CORRECT ONLY: only editable in override mode (past or today), never future
                                if (isHrCorrectOnly) {
                                  editable = Boolean(overrideEnabled && canOverride && !isMonthClosed && !isFuture);
                                } else {
                                  // IMPLEMENTATION RULE: Override mode conditions
                                  // isOverrideMode && monthIsOpen && cellDate <= today
                                  if (overrideEnabled && canOverride && !isMonthClosed && !isFuture) {
                                    editable = true;
                                  }

                                  // Normal self-marking rule (non-HR users only)
                                  if (!overrideEnabled && !canOverride && isToday && canWrite && !isMonthClosed) {
                                    editable = true;
                                  }

                                  // HR/SUPER_ADMIN rule: Can mark today's date with write permission
                                  if (isToday && canWrite && !isMonthClosed) {
                                    editable = true;
                                  }

                                  // FORCE: Future dates are NEVER editable, regardless of any other condition
                                  if (isFuture) {
                                    editable = false;
                                  }
                                }
                                
                                const disabled = !editable;
                                
                                return (
                                  <td 
                                    key={dateIso} 
                                    className={cx(
                                      'border-b border-slate-100 px-2 py-2 text-center',
                                      isToday ? 'bg-blue-50/30' : ''
                                    )}
                                  >
                                    {editable ? (
                                      <button
                                        type="button"
                                        className={cx(
                                          'w-12 h-9 rounded-lg border text-xs font-semibold',
                                          statusCellClass(backendStatus),
                                          'hover:shadow-sm',
                                          isToday ? 'ring-2 ring-blue-400' : ''
                                        )}
                                        onClick={() => openMark(e, dateIso)}
                                        title={backendStatus ? `${backendStatus}` : '—'}
                                      >
                                        {displayStatus || '—'}
                                      </button>
                                    ) : (
                                      <div
                                        className={cx(
                                          'w-12 h-9 inline-flex items-center justify-center rounded-lg border text-xs font-semibold opacity-40 cursor-not-allowed pointer-events-none',
                                          statusCellClass(backendStatus),
                                          isToday ? 'ring-2 ring-blue-300' : ''
                                        )}
                                        title="Editing restricted"
                                      >
                                        {displayStatus || '—'}
                                      </div>
                                    )}
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
                  <div className="text-sm font-semibold text-slate-900">Monthly attendance totals</div>
                  <div className="mt-1 text-xs text-slate-500">Read-only aggregation for the selected month.</div>
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
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Days</th>
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
              if (markMutation.status === 'loading' || overrideMutation.status === 'loading') return;
              setMarkOpen(false);
            }}
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">Edit Attendance</div>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <div>
                <div className="text-xs font-medium text-slate-600">Employee</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {markEmployee ? `${markEmployee.employeeCode} · ${markEmployee.firstName} ${markEmployee.lastName}` : '—'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-slate-600">Date</div>
                  <div className="mt-1 text-sm text-slate-900">{markDate || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-600">Old status</div>
                  <div className="mt-1 text-sm text-slate-900">{markOldStatus || '—'}</div>
                </div>
              </div>
            </div>

            {isMonthClosed && !canOverride ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Month is LOCKED. Read-only.</div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">New status</label>
                <select
                  className="mt-1 w-full rounded-md border-slate-300 text-sm"
                  value={markStatus}
                  onChange={(e) => setMarkStatus(e.target.value)}
                  disabled={isMonthClosed && !canOverride}
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="LEAVE">LEAVE</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Reason</label>
                <input
                  className="mt-1 w-full rounded-md border-slate-300 text-sm"
                  value={markReason}
                  onChange={(e) => setMarkReason(e.target.value)}
                  disabled={isMonthClosed && !canOverride}
                  placeholder={permissions.includes('SYSTEM_FULL_ACCESS') ? "Optional for SUPER_ADMIN" : "Required"}
                />
                {(!isMonthClosed || canOverride) && !markReason.trim() && !permissions.includes('SYSTEM_FULL_ACCESS') ? (
                  <div className="mt-1 text-xs text-rose-700">Reason is required.</div>
                ) : null}
              </div>
            </div>

            {markMutation.status === 'error' || overrideMutation.status === 'error' ? (
              <div className="mt-3">
                <ErrorState error={markMutation.error || overrideMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={markMutation.status === 'loading' || overrideMutation.status === 'loading'}
                onClick={() => {
                  setMarkOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={(markMutation.status === 'loading' || overrideMutation.status === 'loading') || (isMonthClosed && !canOverride) || !markEmployee || !markDate || (!markReason.trim() && !permissions.includes('SYSTEM_FULL_ACCESS'))}
                onClick={doSubmitMark}
              >
                {markMutation.status === 'loading' || overrideMutation.status === 'loading' ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Bulk Attendance Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[420px] shadow-xl">
            
            <h3 className="text-lg font-semibold mb-4">
              Bulk Attendance
            </h3>

            <label className="block text-sm mb-2">Date</label>
            <input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />

            <label className="block text-sm mb-2">Status</label>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            >
              <option value="P">Present</option>
              <option value="A">Absent</option>
              <option value="L">Leave</option>
            </select>

            {/* Reason field - only show when override is enabled */}
            {overrideEnabled && (
              <div>
                <label className="block text-sm mb-2">Reason *</label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mb-4"
                  placeholder="Required for override"
                />
                {!overrideReason.trim() && (
                  <div className="text-xs text-red-600 mb-4">Reason is required for override</div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setBulkModalOpen(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleBulkSubmit}
                disabled={bulkLoading}
                className={cx(
                  "px-4 py-2 bg-blue-600 text-white rounded-lg",
                  bulkLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {bulkLoading ? "Applying..." : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
