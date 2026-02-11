import React, { useState, useEffect } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { LoadingState, ErrorState, EmptyState, ForbiddenState } from '../../components/States.jsx';
import { CollapsibleSection } from './components/CollapsibleSection.jsx';
import { LeaveTable } from './components/LeaveTable.jsx';
import { LeaveDrawer } from './components/LeaveDrawer.jsx';

export function TeamLeavePage() {
  const { bootstrap } = useBootstrap();
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Filter states
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');

  // API call for team leave list
  const {
    data,
    status,
    error,
    refresh
  } = usePagedQuery({ 
    path: "/api/v1/leave/requests", 
    page: 1, 
    pageSize: 50,
    enabled: true
  });

  // Role-based access control
  const roles = bootstrap?.rbac?.roles || [];
  const userRole = roles[0]; // Get primary role
  const allowedRoles = [
    "MANAGER",
    "SUPER_ADMIN",
    "HR_ADMIN",
    "FOUNDER"
  ];

  if (!allowedRoles.includes(userRole)) {
    return <ForbiddenState />;
  }

  // Refetch when filters change
  useEffect(() => {
    refresh();
  }, [selectedEmployee, selectedStatus, selectedLeaveType, refresh]);

  const handleViewLeave = (record) => {
    setSelectedLeaveId(record.id);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedLeaveId(null);
  };

  const handleApprove = (record) => {
    console.log('Approve leave:', record);
    // This will be implemented with proper API call
  };

  const handleReject = (record) => {
    console.log('Reject leave:', record);
    // This will be implemented with proper API call
  };

  // Handle loading and error states
  if (status === 'loading') return <LoadingState />;
  if (status === 'error') return <ErrorState onRetry={refresh} />;

  // Calculate statistics from data
  const totalRequests = data?.content?.length || 0;
  const approvedCount = data?.content?.filter(item => item.status === 'APPROVED').length || 0;
  const pendingCount = data?.content?.filter(item => item.status === 'PENDING').length || 0;
  const rejectedCount = data?.content?.filter(item => item.status === 'REJECTED').length || 0;

  return (
    <div className="space-y-6">
      {/* Month Lock Banner */}
      {data?.monthLocked && (
        <div className="bg-gray-100 border border-gray-200 text-gray-600 px-4 py-3 rounded-xl">
          🔒 Leave records for this month are locked.
        </div>
      )}

      {/* Team Leave Statistics */}
      <CollapsibleSection title="Team Leave Statistics" defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-gray-800">{totalRequests}</div>
            <div className="text-sm text-gray-500 mt-1">Total Requests</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <div className="text-sm text-gray-500 mt-1">Approved</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-sm text-gray-500 mt-1">Pending</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
            <div className="text-sm text-gray-500 mt-1">Rejected</div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Filters Section */}
      <CollapsibleSection title="Filters" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
            <select 
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Team Members</option>
              {/* Employee options will be populated from backend */}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
            <select 
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="PAID_LEAVE">Paid Leave (PL)</option>
              <option value="SICK_LEAVE">Sick Leave (SL)</option>
              <option value="CASUAL_LEAVE">Casual Leave (CL)</option>
              <option value="UNPAID_LEAVE">Unpaid Leave (LWP)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>

      {/* Team Leave Requests */}
      <CollapsibleSection title="Team Leave Requests" defaultOpen={true}>
        {data?.content?.length ? (
          <LeaveTable 
            data={data.content} 
            role={userRole} 
            monthLocked={data.monthLocked}
            onView={handleViewLeave}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ) : (
          <EmptyState message="No team leave requests found." />
        )}
      </CollapsibleSection>

      {/* Leave Details Drawer */}
      <LeaveDrawer 
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        leaveId={selectedLeaveId}
      />
    </div>
  );
}
