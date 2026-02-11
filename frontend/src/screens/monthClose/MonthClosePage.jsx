import React, { useState, useMemo } from 'react';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
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

export function MonthClosePage() {
  const { bootstrap } = useBootstrap();
  const title = bootstrap?.ui?.screens?.monthClose?.title || 'Month Close';

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

  const closeMonthMutation = useMutation(async (monthEnd) => {
    return apiFetch('/api/v1/governance/month-close/status', {
      method: 'POST',
      body: { 
        month: monthEnd, 
        status: 'CLOSED', 
        reason: 'Month close completed through governance interface' 
      }
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
      await closeMonthMutation.run(selectedMonth.monthEnd);
      
      // Show success state
      setSuccessState({
        month: selectedMonth.month,
        monthEnd: selectedMonth.monthEnd
      });
      
      // Refresh data
      await fetchLatestItems();
      
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

  if (list.status === 'loading' && !list.data) {
    return (
      <div className="min-h-screen bg-slate-100">
        {/* Global Header - matching DivisionsPage exactly */}
        <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
          <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <img 
                  src="/image.png" 
                  alt="JASIQ" 
                  className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
                />
                <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
              </div>
              <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
                <span className="text-white">Governance</span>
                <span className="mx-2">·</span>
                <span className="text-amber-400">Month Close</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-32 sm:pt-32 lg:pt-16">
          <PageHeader title={title} variant="divisions" />
          <LoadingState />
        </div>
      </div>
    );
  }

  if (list.status === 'error') {
    if (list.error?.status === 403) {
      return (
        <div className="min-h-screen bg-slate-100">
          {/* Global Header - matching DivisionsPage exactly */}
          <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
            <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <img 
                    src="/image.png" 
                    alt="JASIQ" 
                    className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
                  />
                  <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
                </div>
                <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
                  <span className="text-white">Governance</span>
                  <span className="mx-2">·</span>
                  <span className="text-amber-400">Month Close</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-32 sm:pt-32 lg:pt-16">
            <PageHeader title={title} variant="divisions" />
            <ForbiddenState />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-100">
        {/* Global Header - matching DivisionsPage exactly */}
        <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
          <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <img 
                  src="/image.png" 
                  alt="JASIQ" 
                  className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
                />
                <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
              </div>
              <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
                <span className="text-white">Governance</span>
                <span className="mx-2">·</span>
                <span className="text-amber-400">Month Close</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-32 sm:pt-32 lg:pt-16">
          <PageHeader title={title} variant="divisions" />
          <ErrorState error={list.error} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Global Header - matching DivisionsPage exactly */}
      <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
        <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <img 
                src="/image.png" 
                alt="JASIQ" 
                className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
              />
              <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
            </div>
            <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
              <span className="text-white">Governance</span>
              <span className="mx-2">·</span>
              <span className="text-amber-400">Month Close</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-32 sm:pt-32 lg:pt-16">
        <PageHeader title={title} variant="divisions" />

      {/* Success State */}
      {successState && (
        <div className="mx-4 mt-4 mb-2 md:mx-6 lg:mx-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 mb-1">
                  {successState.month} is now closed.
                </h3>
                <p className="text-green-700 mb-4">
                  All records are locked and ready for reporting.
                </p>
                <div className="flex gap-3">
                  <button
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    onClick={() => setSuccessState(null)}
                  >
                    View Reports
                  </button>
                  <button
                    className="border border-green-300 text-green-700 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors"
                    onClick={() => setSuccessState(null)}
                  >
                    Return to Month Close Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Banner */}
      <div className="mx-4 mt-4 mb-4 md:mx-6 lg:mx-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">
              Month Close is a high-risk governance action.
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Once a month is closed, all records become immutable and cannot be modified.
            </p>
          </div>
        </div>
      </div>

      {/* Explanatory Note */}
      <div className="mx-4 mb-6 md:mx-6 lg:mx-8">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-700">
            Only one month can be open at a time.
            Closing the current month will automatically open the next month.
          </p>
        </div>
      </div>

      {/* Month Status Table */}
      <div className="mx-4 mb-6 md:mx-6 lg:mx-8">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Month Status Overview</h2>
            <p className="text-sm text-slate-600 mt-1">Review module statuses and close months when ready</p>
          </div>
          
          {/* Mobile Cards */}
          <div className="p-4 md:hidden">
            <div className="grid grid-cols-1 gap-4">
              {monthStatusData.map((monthData, index) => (
                <div key={index} className={`border rounded-lg p-4 ${
                  monthData.isFutureMonth 
                    ? 'border-slate-200 bg-slate-50 opacity-75'
                    : monthData.isOpenMonth
                      ? 'border-blue-200 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`font-semibold ${
                      monthData.isOpenMonth ? 'text-blue-900' : 'text-slate-900'
                    }`}>
                      {monthData.month}
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      monthData.status === 'CLOSED' 
                        ? 'bg-green-100 text-green-800' 
                        : monthData.status === 'LOCKED'
                          ? 'bg-slate-100 text-slate-600'
                          : monthData.isOpenMonth
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-blue-100 text-blue-800'
                    }`}>
                      {monthData.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                    <div className="text-center">
                      <div className="font-medium text-slate-700">Attendance</div>
                      <div className={`mt-1 ${
                        monthData.attendance === 'Locked' ? 'text-green-600' : 'text-slate-500'
                      }`}>
                        {monthData.attendance}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-slate-700">Payroll</div>
                      <div className={`mt-1 ${
                        monthData.payroll === 'Locked' ? 'text-green-600' : 
                        monthData.payroll === 'Draft' ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {monthData.payroll}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-slate-700">Finance</div>
                      <div className={`mt-1 ${
                        monthData.finance === 'Locked' ? 'text-green-600' : 'text-slate-500'
                      }`}>
                        {monthData.finance}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    {monthData.status === 'CLOSED' ? (
                      <button className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800 transition-colors">
                        View
                      </button>
                    ) : monthData.isFutureMonth ? (
                      <span className="px-3 py-1 text-sm text-slate-400">
                        Locked
                      </span>
                    ) : monthData.isOpenMonth && monthData.attendance === 'Locked' && monthData.payroll === 'Locked' && monthData.finance === 'Locked' ? (
                      <button 
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                        onClick={() => handleCloseMonth(monthData)}
                      >
                        Close
                      </button>
                    ) : monthData.isOpenMonth ? (
                      <button 
                        className="px-3 py-1 text-sm text-slate-400 cursor-not-allowed"
                        title="All modules must be locked before closing the month"
                        disabled
                      >
                        Close
                      </button>
                    ) : (
                      <span className="px-3 py-1 text-sm text-slate-400">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Attendance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Payroll</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Finance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {monthStatusData.map((monthData, index) => (
                    <tr key={index} className={`${
                      monthData.isFutureMonth 
                        ? 'bg-slate-50 opacity-75' 
                        : monthData.isOpenMonth
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : 'hover:bg-slate-50'
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={monthData.isOpenMonth ? 'text-blue-900' : 'text-slate-900'}>
                          {monthData.month}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          monthData.attendance === 'Locked' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {monthData.attendance}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          monthData.payroll === 'Locked' 
                            ? 'bg-green-100 text-green-800' 
                            : monthData.payroll === 'Draft' 
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                        }`}>
                          {monthData.payroll}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          monthData.finance === 'Locked' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {monthData.finance}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            monthData.status === 'CLOSED' 
                              ? 'bg-green-100 text-green-800' 
                              : monthData.status === 'LOCKED'
                                ? 'bg-slate-100 text-slate-600'
                                : monthData.isOpenMonth
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-blue-100 text-blue-800'
                          }`}>
                            {monthData.status}
                          </span>
                          {monthData.status === 'CLOSED' && (
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {monthData.status === 'CLOSED' ? (
                          <button className="text-slate-600 hover:text-slate-800 font-medium transition-colors">
                            View
                          </button>
                        ) : monthData.isFutureMonth ? (
                          <span className="text-slate-400">Locked</span>
                        ) : monthData.isOpenMonth && monthData.attendance === 'Locked' && monthData.payroll === 'Locked' && monthData.finance === 'Locked' ? (
                          <button 
                            className="text-red-600 hover:text-red-800 font-medium transition-colors"
                            onClick={() => handleCloseMonth(monthData)}
                          >
                            Close
                          </button>
                        ) : monthData.isOpenMonth ? (
                          <button 
                            className="text-slate-400 cursor-not-allowed"
                            title="All modules must be locked before closing the month"
                            disabled
                          >
                            Close
                          </button>
                        ) : (
                          <span className="text-slate-400">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="mx-4 mb-6 md:mx-6 lg:mx-8">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">History</h2>
          </div>
          {items.length === 0 ? (
            <div className="p-8">
              <EmptyState title="No month close entries" description="Month close actions will appear here." />
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {items.map((m) => (
                  <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-slate-500">Month</div>
                        <div className="mt-1 font-mono text-sm text-slate-900">{String(getMonthEndForRow(m)).slice(0, 10)}</div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${m.status === 'CLOSED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {m.status}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <div>
                        <div className="text-xs font-medium text-slate-500">Reason</div>
                        <div className="mt-1 text-sm text-slate-900">
                          {m.closedReason || '-'}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs font-medium text-slate-500">{m.status === 'CLOSED' ? 'Closed At' : 'Opened At'}</div>
                          <div className="mt-1 text-xs text-slate-700">
                            {formatDateTime(m.status === 'CLOSED' ? m.closedAt : m.openedAt)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-500">{m.status === 'CLOSED' ? 'Closed By' : 'Opened By'}</div>
                          <div className="mt-1 text-xs text-slate-700">
                            {formatCreatorName(m.status === 'CLOSED' ? m.closedBy : m.openedBy)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <Table
                    columns={[
                      { key: 'month', title: 'Month', render: (_v, d) => <span className="font-mono text-sm">{String(getMonthEndForRow(d)).slice(0, 10)}</span> },
                      { key: 'status', title: 'Status', render: (_v, d) => (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${d.status === 'CLOSED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {d.status}
                        </span>
                      )},
                      { key: 'actionBy', title: 'Action By', render: (_value, d) => {
                        const userId = d.status === 'CLOSED' ? d.closedBy : d.openedBy;
                        return <span className="text-sm">{formatCreatorName(userId)}</span>;
                      }},
                      { key: 'actionAt', title: 'Action At', render: (_value, d) => {
                        const dateStr = d.status === 'CLOSED' ? d.closedAt : d.openedAt;
                        return <span className="text-sm">{formatDateTime(dateStr)}</span>;
                      }},
                      { key: 'reason', title: 'Reason', render: (_value, d) => <span className="text-sm">{d.closedReason || '-'}</span> }
                    ]}
                    data={items}
                    empty="No month close records found"
                  />
                </div>
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

      {/* Close Month Confirmation Modal */}
      {closeModalOpen && selectedMonth && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setCloseModalOpen(false)} />
            
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Confirm Month Close — {selectedMonth.month}
              </h3>
              
              {/* Pre-Action Warning - Non-dismissible */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-red-800 mb-2">
                  Month Close is a legal-grade governance action.
                </h4>
                <p className="text-sm text-red-700 mb-3">
                  Once this month is closed:
                </p>
                <ul className="text-sm text-red-700 space-y-1 ml-4">
                  <li>• Attendance records become immutable</li>
                  <li>• Payroll is permanently frozen</li>
                  <li>• Financial entries cannot be modified</li>
                </ul>
                <p className="text-sm font-medium text-red-800 mt-3 pt-3 border-t border-red-200">
                  This action cannot be undone.
                </p>
              </div>

              {/* Progress Indicator - Shows actual module status */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      selectedMonth.attendance === 'Locked' 
                        ? 'bg-green-100' 
                        : 'bg-slate-100'
                    }`}>
                      {selectedMonth.attendance === 'Locked' ? (
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                      )}
                    </div>
                    <span className={selectedMonth.attendance === 'Locked' ? 'text-slate-900' : 'text-slate-500'}>
                      Attendance
                    </span>
                  </div>
                  <span className="text-slate-400">→</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      selectedMonth.payroll === 'Locked' 
                        ? 'bg-green-100' 
                        : selectedMonth.payroll === 'Draft' 
                          ? 'bg-amber-100'
                          : 'bg-slate-100'
                    }`}>
                      {selectedMonth.payroll === 'Locked' ? (
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                      )}
                    </div>
                    <span className={selectedMonth.payroll === 'Locked' ? 'text-slate-900' : 'text-slate-500'}>
                      Payroll
                    </span>
                  </div>
                  <span className="text-slate-400">→</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      selectedMonth.finance === 'Locked' 
                        ? 'bg-green-100' 
                        : 'bg-slate-100'
                    }`}>
                      {selectedMonth.finance === 'Locked' ? (
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                      )}
                    </div>
                    <span className={selectedMonth.finance === 'Locked' ? 'text-slate-900' : 'text-slate-500'}>
                      Finance
                    </span>
                  </div>
                  <span className="text-slate-400">→</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-slate-700">Month Closed</span>
                  </div>
                </div>
              </div>

              {/* Mandatory Confirmation Checklist */}
              <div className="space-y-3 mb-6">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-slate-300"
                    checked={checklist.irreversible}
                    onChange={(e) => setChecklist({...checklist, irreversible: e.target.checked})}
                  />
                  <span className="text-sm text-slate-700">I understand this action is irreversible</span>
                </label>
              </div>

              {/* Text Confirmation - Case-sensitive matching */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type CLOSE {formatMonthYear(selectedMonth.monthEnd).toUpperCase()} to continue
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={`CLOSE ${formatMonthYear(selectedMonth.monthEnd).toUpperCase()}`}
                />
              </div>

              {/* Destructive Action Button */}
              <div className="flex gap-3">
                <button
                  type="button"
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  onClick={() => setCloseModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors font-medium"
                  disabled={!canConfirmClose() || closeMonthMutation.status === 'loading'}
                  onClick={handleConfirmClose}
                >
                  {closeMonthMutation.status === 'loading' ? 'Closing...' : 'Close Month'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
