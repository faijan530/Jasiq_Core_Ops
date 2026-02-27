import React, { useState, useEffect } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState, EmptyState } from '../../components/States.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { SummaryCard } from '../../components/SummaryCard.jsx';
import { PermissionDenied } from '../../components/PermissionDenied.jsx';

export function ManagerTeamLeavePage() {
  const { bootstrap } = useBootstrap();
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pendingL1: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedLeaveType, setSelectedLeaveType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [refreshing, setRefreshing] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const userId = bootstrap?.user?.id;
  const permissions = bootstrap?.rbac?.permissions || [];
  const hasPermission = permissions.includes('LEAVE_APPROVE_TEAM');
  const canApproveLeave = hasPermission;

  // Permission check
  if (!hasPermission) {
    return <PermissionDenied permission="LEAVE_APPROVE_TEAM" />;
  }

  // Fetch leave types from DB
  const fetchLeaveTypes = async () => {
    try {
      console.log('Fetching leave types from DB...');
      const response = await apiFetch('/api/v1/leave/types');
      const types = response || [];
      console.log('Leave types fetched:', types);
      setLeaveTypes(Array.isArray(types) ? types : []);
    } catch (err) {
      console.error('Failed to fetch leave types:', err);
      // Set empty array to prevent map errors
      setLeaveTypes([]);
    }
  };

  // Fetch team leave requests
  const fetchTeamLeave = async () => {
    if (!userId) {
      console.log('Leave: No userId found, skipping fetch');
      return;
    }
    
    console.log('Leave: User ID:', userId);
    console.log('Leave: User permissions:', permissions);
    console.log('Leave: Has permission:', hasPermission);
    
    try {
      setError(null);
      
      const statusParam = selectedStatus || 'all';
      console.log('Fetching team leave with status:', statusParam);
      
      const response = await apiFetch(`/api/v1/leave/team?status=${encodeURIComponent(statusParam)}`);
      console.log('Team leave API response:', response);
      
      let leavesData = response || [];
      console.log('Leave data before filtering:', leavesData);

      // Build employee dropdown options from the actual leave response (before filters)
      const employeeById = new Map();
      (leavesData || []).forEach((leave) => {
        if (!leave?.employeeId) return;
        if (employeeById.has(leave.employeeId)) return;
        const name = String(leave.employeeName || '').trim();
        const [firstName, ...rest] = name.split(' ');
        employeeById.set(leave.employeeId, {
          id: leave.employeeId,
          firstName: firstName || name || '',
          lastName: rest.join(' ') || '',
          employeeCode: leave.employeeCode || null
        });
      });
      setEmployees(Array.from(employeeById.values()));

      // Filter by month (API currently doesn't take month)
      if (selectedMonth) {
        leavesData = leavesData.filter((leave) => {
          const d = leave.startDate || leave.createdAt;
          if (!d) return true;
          try {
            return new Date(d).toISOString().slice(0, 7) === selectedMonth;
          } catch {
            return true;
          }
        });
      }
      
      // Filter by selected employee
      if (selectedEmployee !== 'all') {
        leavesData = leavesData.filter(leave => leave.employeeId === selectedEmployee);
      }
      
      // Filter by leave type
      if (selectedLeaveType !== 'all') {
        leavesData = leavesData.filter(leave => leave.leaveType === selectedLeaveType);
      }
      
      console.log('Leave data after all filtering:', leavesData);
      setLeaves(leavesData);
      
      // Calculate summary from real data
      const total = leavesData.length;
      const pendingL1 = leavesData.filter(l => l.status === 'SUBMITTED' || l.status === 'PENDING_L1').length;
      const approved = leavesData.filter(l => l.status === 'APPROVED').length;
      const rejected = leavesData.filter(l => l.status === 'REJECTED').length;
      
      setSummary({ total, pendingL1, approved, rejected });
      console.log('Leave summary set:', { total, pendingL1, approved, rejected });
    } catch (err) {
      console.error('Failed to fetch team leave requests:', err);
      if (err.status === 403) {
        setError('You do not have permission to view team leave. Required permission: LEAVE_APPROVE_TEAM');
      } else {
        setError(err.message || 'Failed to load team leave requests');
      }
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchTeamLeave();
    } finally {
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const initializeData = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        await fetchLeaveTypes();
        
        // Fetch leave data
        await fetchTeamLeave();
      } catch (err) {
        console.error('Error initializing data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    initializeData();
  }, [userId]);

  // Refetch leave data when filters change
  useEffect(() => {
    if (userId && !loading) {
      fetchTeamLeave();
    }
  }, [selectedStatus, selectedEmployee, selectedLeaveType, selectedMonth]);

  const handleApprove = (leave) => {
    setSelectedLeave(leave);
    setShowApproveModal(true);
  };

  const handleReject = (leave) => {
    setSelectedLeave(leave);
    setShowRejectModal(true);
    setRejectReason('');
  };

  const confirmApprove = async () => {
    if (!selectedLeave) return;
    
    try {
      setSubmitting(true);
      await apiFetch(`/api/v1/leave/requests/${selectedLeave.id}/approve`, {
        method: 'POST'
      });
      
      setShowApproveModal(false);
      setSelectedLeave(null);
      fetchTeamLeave();
      
      console.log('Leave request approved successfully');
    } catch (err) {
      console.error('Failed to approve leave:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedLeave || !rejectReason.trim()) return;
    
    try {
      setSubmitting(true);
      await apiFetch(`/api/v1/leave/requests/${selectedLeave.id}/reject`, {
        method: 'POST',
        body: { reason: rejectReason.trim() }
      });
      
      setShowRejectModal(false);
      setSelectedLeave(null);
      setRejectReason('');
      fetchTeamLeave();
      
      console.log('Leave request rejected successfully');
    } catch (err) {
      console.error('Failed to reject leave:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const styles = {
      SUBMITTED: 'bg-yellow-100 text-yellow-800',
      PENDING_L2: 'bg-orange-100 text-orange-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (!canApproveLeave) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Team Leave Approvals" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-slate-600">You don't have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Team Leave Approvals" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Team Leave Approvals" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorState error={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Team Leave Approvals" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Total"
            value={summary.total}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            color="blue"
          />
          
          <SummaryCard
            title="Pending"
            value={summary.pendingL1}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="amber"
          />
          
          <SummaryCard
            title="Approved"
            value={summary.approved}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
          />
          
          <SummaryCard
            title="Rejected"
            value={summary.rejected}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="red"
          />
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Employees</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Leave Type
              </label>
              <select
                value={selectedLeaveType}
                onChange={(e) => setSelectedLeaveType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                {Array.isArray(leaveTypes) && leaveTypes.map(type => (
                  <option key={type.id} value={type.code}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="SUBMITTED">Pending Approval</option>
                <option value="PENDING_L1">Pending L1 Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {refreshing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Leave Requests</h3>
          </div>
          
          {loading ? (
            <div className="p-8">
              <LoadingState />
            </div>
          ) : leaves.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No leave requests found</h3>
              <p className="text-slate-600">No leave requests matching the selected criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Employee Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Date Range
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Submitted At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {leave.employeeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {leave.employeeCode || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {leave.startDate} - {leave.endDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {leave.leaveType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {leave.days}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {leave.submittedAt ? formatDate(leave.submittedAt) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(leave.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {(leave.status === 'SUBMITTED' || leave.status === 'PENDING_L1') ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApprove(leave)}
                              className="text-green-600 hover:text-green-900 px-3 py-1 bg-green-50 rounded hover:bg-green-100 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(leave)}
                              className="text-red-600 hover:text-red-900 px-3 py-1 bg-red-50 rounded hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/*Modal */}
      {showApproveModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Approve Leave Request</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Employee:</span>
                <span className="text-sm font-medium">{selectedLeave.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Date Range:</span>
                <span className="text-sm font-medium">
                  {formatDate(selectedLeave.startDate)} - {formatDate(selectedLeave.endDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Leave Type:</span>
                <span className="text-sm font-medium">{selectedLeave.leaveType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Days:</span>
                <span className="text-sm font-medium">{selectedLeave.days}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedLeave(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmApprove}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Reject Leave Request</h3>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Employee:</span>
                <span className="text-sm font-medium">{selectedLeave.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Date Range:</span>
                <span className="text-sm font-medium">
                  {formatDate(selectedLeave.startDate)} - {formatDate(selectedLeave.endDate)}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for Rejection *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Please provide a reason for rejection..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedLeave(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={submitting || !rejectReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
