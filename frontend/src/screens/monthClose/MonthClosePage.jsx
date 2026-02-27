import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch } from '../../api/client.js';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

function toMonthEndIso(date) {
  const d = date instanceof Date ? date : new Date(date);
  const utcEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return utcEnd.toISOString().slice(0, 10);
}

function toMonthInputValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 7);
}

function getMonthEndForRow(row) {
  return toMonthEndIso(row?.monthEnd || row?.monthStart || row?.month);
}

function formatMonthYear(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      year: 'numeric' 
    }) + ' · ' + date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

function formatCreatorName(userId) {
  // Default to "System Admin" instead of showing raw UUIDs
  if (!userId) return 'System Admin';
  
  // Check for known patterns and provide human-readable names
  if (userId.includes('COREOPS_ADMIN')) return 'Amit Sharma (COREOPS_ADMIN)';
  if (userId.includes('ADMIN')) return 'System Admin';
  if (userId.includes('SYSTEM')) return 'System';
  
  // If it looks like a UUID, return the default label
  if (userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
    return 'System Admin';
  }
  
  // For any other format, return as-is (fallback)
  return userId;
}

function monthRangeFromMonthEnd(monthEndIso) {
  const d = new Date(`${String(monthEndIso).slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return { from: null, to: null };
  const from = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return { from, to };
}

export function MonthClosePage() {
  const navigate = useNavigate();
  const { bootstrap } = useBootstrap();
  const title = bootstrap?.ui?.screens?.monthClose?.title || 'Month Close';
  const roles = bootstrap?.rbac?.roles || [];
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Modal states
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [checklist, setChecklist] = useState({
    irreversible: false
  });
  const [confirmationText, setConfirmationText] = useState('');
  const [successState, setSuccessState] = useState(null);

  const list = usePagedQuery({ path: '/api/v1/governance/month-close', page, pageSize, enabled: true });

  useEffect(() => {
    list.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure data is fetched and log errors
  useEffect(() => {
    if (list.status === 'error') {
      console.error('Month Close data fetch error:', list.error);
    }
    if (list.data?.items) {
      console.log('Month Close data loaded:', list.data.items.length, 'items');
    }
  }, [list.status, list.data, list.error]);

  const closeMonthMutation = useMutation(async ({ month, reason }) => {
    return apiFetch('/api/v1/governance/month-close/close', {
      method: 'POST',
      body: { month, reason }
    });
  });

  const items = list.data?.items || [];
  const total = list.data?.total || 0;

  // Generate month status data with proper lifecycle logic
  const monthStatusData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    // Find the most recent closed month to determine current open month
    const sortedItems = [...items].sort((a, b) => {
      const dateA = new Date(getMonthEndForRow(a));
      const dateB = new Date(getMonthEndForRow(b));
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });
    
    const mostRecentClosed = sortedItems.find(item => item.status === 'CLOSED');
    const currentMonthEnd = toMonthEndIso(now);
    
    // Generate last 6 months + current month + 2 future months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = toMonthEndIso(date);
      const existingRecord = items.find(item => getMonthEndForRow(item) === monthEnd);
      
      // Determine if this is the current open month
      const isOpenMonth = !existingRecord && 
                         (!mostRecentClosed || new Date(monthEnd) > new Date(getMonthEndForRow(mostRecentClosed)));
      
      // Determine if this is a future month
      const isFutureMonth = new Date(monthEnd) > new Date(currentMonthEnd);
      
      let status;
      let attendance, payroll, finance;
      
      if (existingRecord && existingRecord.status === 'CLOSED') {
        // Already closed months
        status = 'CLOSED';
        attendance = 'Locked';
        payroll = 'Locked';
        finance = 'Locked';
      } else if (isFutureMonth) {
        // Future months are locked
        status = 'LOCKED';
        attendance = 'Locked';
        payroll = 'Locked';
        finance = 'Locked';
      } else if (isOpenMonth) {
        // Current open month
        status = 'OPEN · Current';
        attendance = i < 2 ? 'Locked' : 'Open'; // Recent months likely have attendance locked
        payroll = i < 1 ? 'Locked' : 'Open';    // Very recent months have payroll locked
        finance = 'Open';                       // Finance usually stays open until close
      } else {
        // Past months that should be closed but aren't (edge case)
        status = 'OPEN';
        attendance = 'Locked';
        payroll = 'Locked';
        finance = 'Open';
      }
      
      data.push({
        month: formatMonthYear(monthEnd),
        monthEnd,
        attendance,
        payroll,
        finance,
        status,
        record: existingRecord,
        isOpenMonth,
        isFutureMonth
      });
    }
    
    return data;
  }, [items]);

  const fetchLatestItems = async () => {
    const payload = await apiFetch(list.url);
    return payload?.items || [];
  };

  const handleCloseMonth = (monthData) => {
    setSelectedMonth(monthData);
    setCloseModalOpen(true);
    setChecklist({
      irreversible: false
    });
    setConfirmationText('');
  };

  const handleConfirmClose = async () => {
    try {
      await closeMonthMutation.run({
        month: toMonthInputValue(selectedMonth.monthEnd),
        reason: 'Month close completed through governance interface'
      });
      
      // Show success state
      setSuccessState({
        month: selectedMonth.month,
        monthEnd: selectedMonth.monthEnd
      });
      
      // Refresh data
      list.refresh();
      
      // Close modal
      setCloseModalOpen(false);
      setSelectedMonth(null);
    } catch (error) {
      console.error('Failed to close month:', error);
    }
  };

  const canConfirmClose = () => {
    const expectedText = `CLOSE ${formatMonthYear(selectedMonth?.monthEnd || '').toUpperCase()}`;
    return checklist.irreversible && 
           confirmationText === expectedText;
  };

  if (!isSuperAdmin) {
    return <ForbiddenState />;
  }

  if (list.status === 'loading' && !list.data) {
    return <LoadingState />;
  }

  if (list.status === 'error') {
    return <ErrorState error={list.error} />;
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold">
          Month Close
        </h1>
        <p className="text-sm text-gray-500">
          Financial period management and reporting
        </p>
      </div>

      {/* Success State */}
      {successState && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-emerald-900 mb-1">
                {successState.month} is now closed.
              </h3>
              <p className="text-emerald-700 mb-4">
                All records are locked and ready for reporting.
              </p>
              <div className="flex gap-3">
                <button
                  className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  onClick={() => {
                    const { from, to } = monthRangeFromMonthEnd(successState.monthEnd);
                    navigate(`/super-admin/reports/pnl?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&groupBy=DIVISION&includePayroll=true`);
                  }}
                >
                  View Reports
                </button>
                <button
                  className="border border-emerald-300 text-emerald-700 px-4 py-2 rounded-xl font-semibold hover:bg-emerald-50 transition-all duration-200"
                  onClick={() => setSuccessState(null)}
                >
                  Return to Month Close Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Month Close Content */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              Month Close Records
            </div>
            <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
              <span className="text-sm font-medium text-slate-700">{monthStatusData.length} records</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          {monthStatusData.length === 0 ? (
            <EmptyState title="No month records found" description="No month records found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full">
                <thead className="sticky top-0 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-4 font-bold text-slate-900">Month</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-900">Status</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-900">Attendance</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-900">Payroll</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-900">Finance</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {monthStatusData.map((month) => (
                    <tr key={month.monthEnd} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900">{formatMonthYear(month.monthEnd)}</div>
                        <div className="text-sm text-slate-500 font-mono">{month.monthEnd}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${
                          month.status === 'CLOSED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : month.status.includes('Current')
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {month.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">View only</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">View only</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">View only</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          {month.status !== 'CLOSED' && month.status !== 'LOCKED' ? (
                            <button
                              onClick={() => {
                                setSelectedMonth(month);
                                setCloseModalOpen(true);
                              }}
                              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all duration-200"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Close Month
                            </button>
                          ) : (
                            <span className="text-sm text-slate-500 font-medium">Closed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {closeModalOpen && selectedMonth ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (closeMonthMutation.status === 'loading') return;
              setCloseModalOpen(false);
              setSelectedMonth(null);
              setChecklist({ irreversible: false });
              setConfirmationText('');
            }}
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-900">Close Month</div>
                <div className="mt-1 text-sm text-slate-600">
                  {formatMonthYear(selectedMonth.monthEnd)} ({selectedMonth.monthEnd})
                </div>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  if (closeMonthMutation.status === 'loading') return;
                  setCloseModalOpen(false);
                  setSelectedMonth(null);
                  setChecklist({ irreversible: false });
                  setConfirmationText('');
                }}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checklist.irreversible}
                  onChange={(e) => setChecklist((prev) => ({ ...prev, irreversible: e.target.checked }))}
                />
                <span>
                  I understand this action is irreversible.
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700">Type confirmation</label>
                <div className="mt-1 text-xs text-slate-500">
                  Type: <span className="font-mono">CLOSE {formatMonthYear(selectedMonth.monthEnd).toUpperCase()}</span>
                </div>
                <input
                  className="mt-2 w-full rounded-md border-slate-300 text-sm bg-white"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                />
              </div>

              {closeMonthMutation.status === 'error' ? (
                <ErrorState error={closeMonthMutation.error} />
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                disabled={closeMonthMutation.status === 'loading'}
                onClick={() => {
                  setCloseModalOpen(false);
                  setSelectedMonth(null);
                  setChecklist({ irreversible: false });
                  setConfirmationText('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:bg-slate-400"
                disabled={closeMonthMutation.status === 'loading' || !canConfirmClose()}
                onClick={handleConfirmClose}
              >
                {closeMonthMutation.status === 'loading' ? 'Closing…' : 'Confirm Close'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
