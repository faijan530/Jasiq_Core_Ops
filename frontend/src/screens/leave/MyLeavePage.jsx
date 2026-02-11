import React, { useState, useEffect } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useMutation } from '../../hooks/useMutation.js';
import { LoadingState, ErrorState, EmptyState, ForbiddenState } from '../../components/States.jsx';
import { CollapsibleSection } from './components/CollapsibleSection.jsx';
import { LeaveTable } from './components/LeaveTable.jsx';
import { LeaveDrawer } from './components/LeaveDrawer.jsx';
import { LeaveBalanceCards } from './components/LeaveBalanceCards.jsx';

export function MyLeavePage() {
  const { bootstrap } = useBootstrap();
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Form states for new leave application
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  // API call for my leave list
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

  // Mutation for submitting leave
  const submitMutation = useMutation(async (leaveData) => {
    const response = await fetch('/api/v1/leave', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(leaveData),
    });
    if (!response.ok) {
      throw new Error('Failed to submit leave request');
    }
    return response.json();
  });

  // Role-based access control
  const roles = bootstrap?.rbac?.roles || [];
  const userRole = roles[0]; // Get primary role
  const allowedRoles = [
    "EMPLOYEE",
    "MANAGER",
    "SUPER_ADMIN",
    "HR_ADMIN",
    "FOUNDER",
    "FINANCE_ADMIN"
  ];

  if (!allowedRoles.includes(userRole)) {
    return <ForbiddenState />;
  }

  const handleViewLeave = (record) => {
    setSelectedLeaveId(record.id);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedLeaveId(null);
  };

  const handleSubmitLeave = async () => {
    try {
      await submitMutation.run(formData);
      setFormData({ leaveType: '', startDate: '', endDate: '', reason: '' });
      refresh();
    } catch (error) {
      console.error('Failed to submit leave:', error);
    }
  };

  // Handle loading and error states
  if (status === 'loading') return <LoadingState />;
  if (status === 'error') return <ErrorState onRetry={refresh} />;

  return (
    <div className="space-y-6">
      {/* Leave Balance Cards */}
      <CollapsibleSection title="Leave Balance" defaultOpen={true}>
        <LeaveBalanceCards />
      </CollapsibleSection>

      {/* Apply Leave Section */}
      <CollapsibleSection title="Apply for Leave" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
            <select 
              value={formData.leaveType}
              onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Leave Type</option>
              <option value="PAID_LEAVE">Paid Leave (PL)</option>
              <option value="SICK_LEAVE">Sick Leave (SL)</option>
              <option value="CASUAL_LEAVE">Casual Leave (CL)</option>
              <option value="UNPAID_LEAVE">Unpaid Leave (LWP)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Multiple Days</option>
              <option>Single Day</option>
              <option>Half Day</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input 
              type="date" 
              value={formData.startDate}
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input 
              type="date" 
              value={formData.endDate}
              onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
          <textarea 
            rows={3}
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Please provide a reason for your leave request..."
          ></textarea>
        </div>
        
        <div className="mt-4 flex gap-3">
          <button 
            onClick={handleSubmitLeave}
            disabled={submitMutation.status === 'loading' || data?.monthLocked}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              data?.monthLocked || submitMutation.status === 'loading'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {submitMutation.status === 'loading' ? 'Submitting...' : 'Submit Leave Request'}
          </button>
          <button className="px-4 py-2 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
            Save as Draft
          </button>
        </div>
      </CollapsibleSection>

      {/* My Leave History */}
      <CollapsibleSection title="My Leave History" defaultOpen={true}>
        {data?.content?.length ? (
          <LeaveTable 
            data={data.content} 
            role={userRole} 
            monthLocked={data.monthLocked}
            onView={handleViewLeave}
          />
        ) : (
          <EmptyState message="No leave records found." />
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
