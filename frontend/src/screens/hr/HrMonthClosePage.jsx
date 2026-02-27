import React, { useState, useEffect } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { ForbiddenState, LoadingState, ErrorState } from '../../components/States.jsx';
import { apiFetch } from '../../api/client.js';

export function HrMonthClosePage() {
  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];
  const roles = bootstrap?.rbac?.roles || [];
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  if (!isSuperAdmin && !permissions.includes('LEAVE_MONTH_CLOSE_OVERRIDE') && !permissions.includes('GOV_MONTH_CLOSE_READ')) {
    return <ForbiddenState />;
  }

  // Dynamic month state
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [monthStatus, setMonthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedMonth) {
      fetchMonthStatus();
    }
  }, [selectedMonth]);

  const fetchMonthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch(`/api/v1/governance/month-close?month=${selectedMonth}`);
      setMonthStatus(data);
    } catch (err) {
      console.error('[HrMonthClosePage] Error loading month status:', err);
      if (err.status === 403) {
        setError('forbidden');
      } else {
        setError('Unable to load month status');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMonthClose = async () => {
    const reason = prompt('Please provide a reason for closing the month:');
    if (!reason) return;

    try {
      await apiFetch('/api/v1/governance/month-close/close', {
        method: 'POST',
        body: {
          month: selectedMonth,
          reason
        }
      });
      fetchMonthStatus(); // Refresh status
    } catch (err) {
      console.error('Failed to close month:', err);
      alert(`Error: ${err.message || 'Failed to close month'}`);
    }
  };

  // Permission-based action visibility
  const canCloseMonth = isSuperAdmin || permissions.includes('MONTH_CLOSE_MANAGE');

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Month Close Management</h1>
          <p className="text-sm text-slate-600 mt-1">Manage monthly closing periods and attendance finalization</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <LoadingState message="Loading month status..." />
        </div>
      </div>
    );
  }

  // Error states
  if (error === 'forbidden') {
    return <ForbiddenState />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Month Close Management</h1>
          <p className="text-sm text-slate-600 mt-1">Manage monthly closing periods and attendance finalization</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <ErrorState error={{ message: error }} />
          <div className="mt-4">
            <button
              onClick={fetchMonthStatus}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    if (status === 'OPEN') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (status === 'CLOSED') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Month Close Management</h1>
            <p className="text-sm text-slate-600 mt-1">Manage monthly closing periods and attendance finalization</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Summary Card */}
        {monthStatus?.summary && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Monthly Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-slate-900">{monthStatus.summary.totalEmployees}</div>
                <div className="text-sm text-slate-600">Total Employees</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-amber-900">{monthStatus.summary.pendingLeaveRequests}</div>
                <div className="text-sm text-amber-600">Pending Leave Requests</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-900">{monthStatus.summary.pendingAttendanceCorrections}</div>
                <div className="text-sm text-blue-600">Pending Attendance Corrections</div>
              </div>
            </div>
          </div>
        )}

        {/* Status Card */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Month Status</h2>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(monthStatus?.status)}`}>
              {monthStatus?.status}
            </span>
          </div>

          {/* Reason */}
          {monthStatus?.reason && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="text-sm font-medium text-slate-700 mb-1">Reason:</div>
              <div className="text-sm text-slate-900">{monthStatus.reason}</div>
            </div>
          )}

          {/* Closed By */}
          {monthStatus?.closedBy && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="text-sm font-medium text-slate-700 mb-1">Closed By:</div>
              <div className="text-sm text-slate-900">{monthStatus.closedBy.name}</div>
              {monthStatus.closedAt && (
                <div className="text-xs text-slate-600 mt-1">
                  {new Date(monthStatus.closedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {monthStatus?.status === 'OPEN' && canCloseMonth && (
              <button
                onClick={handleMonthClose}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Close Month
              </button>
            )}

            {!canCloseMonth && monthStatus?.status === 'OPEN' && (
              <div className="text-sm text-slate-600 py-2">
                You don't have permission to close the month.
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
