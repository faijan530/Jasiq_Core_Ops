import React, { useState, useEffect } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { LoadingState, ErrorState, EmptyState, ForbiddenState } from '../../components/States.jsx';
import { CollapsibleSection } from './components/CollapsibleSection.jsx';
import { LeaveTable } from './components/LeaveTable.jsx';
import { LeaveDrawer } from './components/LeaveDrawer.jsx';

export function LeaveOverviewPage() {
  const { bootstrap } = useBootstrap();
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Filter states
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  // API call for leave list
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
    "SUPER_ADMIN",
    "FOUNDER",
    "HR_ADMIN",
    "FINANCE_ADMIN"
  ];

  if (!allowedRoles.includes(userRole)) {
    return <ForbiddenState />;
  }

  // Refetch when filters change
  useEffect(() => {
    refresh();
  }, [selectedMonth, selectedStatus, selectedEmployee, refresh]);

  const handleViewLeave = (record) => {
    setSelectedLeaveId(record.id);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedLeaveId(null);
  };

  // Handle loading and error states
  if (status === 'loading') return <LoadingState />;
  if (status === 'error') return <ErrorState onRetry={refresh} />;
  if (!data?.content?.length) {
    return (
      <div className="space-y-6">
        {/* Month Lock Banner */}
        {data?.monthLocked && (
          <div className="bg-gray-100 border border-gray-200 text-gray-600 px-4 py-3 rounded-xl">
            🔒 Leave records for this month are locked.
          </div>
        )}
        
        {/* Filters Section */}
        <CollapsibleSection title="Filters" defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
              <select 
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Employees</option>
                {/* Employee options will be populated from backend */}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
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
                <option value="LOCKED">Locked</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Month</option>
                <option value="2026-02">February 2026</option>
                <option value="2026-01">January 2026</option>
                <option value="2025-12">December 2025</option>
                <option value="2025-11">November 2025</option>
              </select>
            </div>
          </div>
        </CollapsibleSection>

        <EmptyState message="No leave records found." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Lock Banner */}
      {data?.monthLocked && (
        <div className="bg-gray-100 border border-gray-200 text-gray-600 px-4 py-3 rounded-xl">
          🔒 Leave records for this month are locked.
        </div>
      )}

      {/* Filters Section */}
      <CollapsibleSection title="Filters" defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
            <select 
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Employees</option>
              {/* Employee options will be populated from backend */}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
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
              <option value="LOCKED">Locked</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Month</option>
              <option value="2026-02">February 2026</option>
              <option value="2026-01">January 2026</option>
              <option value="2025-12">December 2025</option>
              <option value="2025-11">November 2025</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>

      {/* Leave Records Section */}
      <CollapsibleSection title="Leave Records" defaultOpen={true}>
        <LeaveTable 
          data={data.content} 
          role={userRole} 
          monthLocked={data.monthLocked}
          onView={handleViewLeave}
        />
      </CollapsibleSection>

      {/* Policy Info Section */}
      <CollapsibleSection title="Policy Info" defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Supported Leave Types:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• <strong>Paid Leave (PL)</strong> - Standard paid time off</li>
              <li>• <strong>Sick Leave (SL)</strong> - Medical-related absence</li>
              <li>• <strong>Casual Leave (CL)</strong> - Short-term personal leave</li>
              <li>• <strong>Unpaid Leave (LWP)</strong> - Leave without pay</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> Leave affects attendance, not salary directly.
            </p>
          </div>
        </div>
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
