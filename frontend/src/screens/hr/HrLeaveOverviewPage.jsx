import React, { useState, useEffect } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { ForbiddenState, LoadingState, ErrorState } from '../../components/States.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { apiFetch } from '../../api/client.js';

export function HrLeaveOverviewPage() {
  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];

  if (!permissions.includes('LEAVE_REQUEST_READ')) {
    return <ForbiddenState />;
  }

  // State management
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [monthStatus, setMonthStatus] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  // API calls
  const leaveRequests = usePagedQuery({ 
    path: "/api/v1/leave/requests", 
    page: 1, 
    pageSize: 100,
    enabled: true
  });

  const employees = usePagedQuery({ 
    path: "/api/v1/employees", 
    page: 1, 
    pageSize: 200,
    enabled: true
  });

  const leaveTypes = usePagedQuery({ 
    path: "/api/v1/leave/types", 
    page: 1, 
    pageSize: 50,
    enabled: true
  });

  // Fetch month status
  useEffect(() => {
    const fetchMonthStatus = async () => {
      try {
        const data = await apiFetch(`/api/v1/governance/month-close?month=${selectedMonth}`);
        if (data.items && data.items.length > 0) {
          setMonthStatus(data.items[0].status === 'CLOSED');
        } else {
          setMonthStatus(false);
        }
      } catch (err) {
        setMonthStatus(false);
      }
    };
    fetchMonthStatus();
  }, [selectedMonth]);

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (selectedMonth) params.set('month', selectedMonth);
    if (selectedEmployee) params.set('employeeId', selectedEmployee);
    if (selectedLeaveType) params.set('leaveTypeId', selectedLeaveType);
    if (selectedStatus) params.set('status', selectedStatus);
    if (selectedDivision) params.set('divisionId', selectedDivision);
    return params.toString();
  };

  // Filter leave requests
  const filteredLeaveRequests = React.useMemo(() => {
    if (!leaveRequests.data?.items) return [];
    
    return leaveRequests.data.items.filter(request => {
      if (selectedEmployee && request.employeeId !== selectedEmployee) return false;
      if (selectedLeaveType && request.leaveTypeId !== selectedLeaveType) return false;
      if (selectedStatus && request.status !== selectedStatus) return false;
      if (selectedDivision && request.employee?.divisionId !== selectedDivision) return false;
      if (selectedMonth && !request.startDate.startsWith(selectedMonth)) return false;
      return true;
    });
  }, [leaveRequests.data?.items, selectedEmployee, selectedLeaveType, selectedStatus, selectedDivision, selectedMonth]);

  // Calculate summary
  const summary = React.useMemo(() => {
    const total = filteredLeaveRequests.length;
    const pending = filteredLeaveRequests.filter(r => r.status === 'PENDING').length;
    const approved = filteredLeaveRequests.filter(r => r.status === 'APPROVED').length;
    const rejected = filteredLeaveRequests.filter(r => r.status === 'REJECTED').length;
    const cancelled = filteredLeaveRequests.filter(r => r.status === 'CANCELLED').length;
    
    return { total, pending, approved, rejected, cancelled };
  }, [filteredLeaveRequests]);

  // Reset filters
  const resetFilters = () => {
    setSelectedEmployee('');
    setSelectedLeaveType('');
    setSelectedStatus('');
    setSelectedDivision('');
  };

  // Status badge colors
  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Loading state
  if (leaveRequests.status === 'loading' || employees.status === 'loading' || leaveTypes.status === 'loading') {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Leave Overview</h1>
          <p className="text-sm text-slate-600 mt-1">Monitor and review employee leave records</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <LoadingState message="Loading leave requests..." />
        </div>
      </div>
    );
  }

  // Error state
  if (leaveRequests.status === 'error' || employees.status === 'error' || leaveTypes.status === 'error') {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Leave Overview</h1>
          <p className="text-sm text-slate-600 mt-1">Monitor and review employee leave records</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <ErrorState error={leaveRequests.error || employees.error || leaveTypes.error} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Leave Overview</h1>
            <p className="text-sm text-slate-600 mt-1">Monitor and review employee leave records</p>
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

      <div className="space-y-4">
        {/* Compact Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0 flex-1"
            >
              <option value="">All Employees</option>
              {employees.data?.items?.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeCode})
                </option>
              ))}
            </select>

            <select
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0 flex-1"
            >
              <option value="">All Leave Types</option>
              {leaveTypes.data?.items?.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0 flex-1"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0 flex-1"
            >
              <option value="">All Divisions</option>
              {[...new Set(employees.data?.items?.map(emp => emp.division).filter(Boolean))].map(division => (
                <option key={division.id} value={division.id}>{division.name}</option>
              ))}
            </select>

            <button
              onClick={resetFilters}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Total:</span>
              <span className="font-medium text-slate-900">{summary.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Pending:</span>
              <span className="font-medium text-amber-700">{summary.pending}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Approved:</span>
              <span className="font-medium text-green-700">{summary.approved}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Rejected:</span>
              <span className="font-medium text-red-700">{summary.rejected}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Cancelled:</span>
              <span className="font-medium text-gray-700">{summary.cancelled}</span>
            </div>
          </div>
        </div>

        {/* Main Data Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Division</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Leave Type</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Date Range</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-700">Days</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Applied On</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Approved By</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No leave requests found</h3>
                      <p className="text-sm text-slate-600">No leave requests match the current filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLeaveRequests.map((request) => (
                    <tr key={request.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {request.employee?.firstName} {request.employee?.lastName}
                        </div>
                        <div className="text-xs text-slate-600">{request.employee?.employeeCode}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {request.employee?.division?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {request.leaveType?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                      </td>
                      <td className="text-center py-3 px-4 text-slate-600">
                        {request.totalDays || '-'}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {request.approvedBy?.name || '-'}
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedLeave(request);
                              setShowViewModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {permissions.includes('LEAVE_OVERRIDE') && !monthStatus && (
                            <button
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Override request"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Leave Request Details</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Employee</label>
                  <p className="text-slate-900">
                    {selectedLeave.employee?.firstName} {selectedLeave.employee?.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Employee Code</label>
                  <p className="text-slate-900">{selectedLeave.employee?.employeeCode}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Leave Type</label>
                  <p className="text-slate-900">{selectedLeave.leaveType?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(selectedLeave.status)}`}>
                    {selectedLeave.status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Start Date</label>
                  <p className="text-slate-900">{new Date(selectedLeave.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">End Date</label>
                  <p className="text-slate-900">{new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Total Days</label>
                  <p className="text-slate-900">{selectedLeave.totalDays}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Applied On</label>
                  <p className="text-slate-900">{new Date(selectedLeave.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedLeave.reason && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Reason</label>
                  <p className="text-slate-900 mt-1">{selectedLeave.reason}</p>
                </div>
              )}
              {selectedLeave.approvedBy && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Approved By</label>
                  <p className="text-slate-900 mt-1">{selectedLeave.approvedBy.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
