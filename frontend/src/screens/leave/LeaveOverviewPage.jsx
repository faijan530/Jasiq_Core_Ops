import React, { useMemo, useState, useEffect } from 'react';
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
  const [selectedLeaveType, setSelectedLeaveType] = useState('');

  const isInMonth = (record, month) => {
    if (!month) return true;
    const m = String(month).slice(0, 7);
    const start = String(record?.startDate || '').slice(0, 7);
    const end = String(record?.endDate || '').slice(0, 7);
    return start === m || end === m;
  };

  const isPendingL1 = (record) => {
    const s = String(record?.status || '').toUpperCase();
    if (s !== 'SUBMITTED') return false;
    return !record?.approvedL1At;
  };

  const isPendingL2 = (record) => {
    const s = String(record?.status || '').toUpperCase();
    if (s !== 'SUBMITTED') return false;
    return Boolean(record?.approvedL1At) && !record?.approvedL2At;
  };

  // API call for leave list
  const {
    data,
    status,
    error,
    refresh
  } = usePagedQuery({ 
    path: "/api/v1/leave/requests", 
    page: 1, 
    pageSize: 200,
    enabled: true,
    queryParams: {
      employeeId: selectedEmployee || undefined,
      status:
        selectedStatus === 'APPROVED' ||
        selectedStatus === 'REJECTED'
          ? selectedStatus
          : undefined
    }
  });

  // API call for employees list
  const {
    data: employeesData,
    status: employeesStatus
  } = usePagedQuery({ 
    path: "/api/v1/employees", 
    page: 1, 
    pageSize: 200,
    enabled: true
  });

  // API call for leave types
  const {
    data: leaveTypesData,
    status: leaveTypesStatus
  } = usePagedQuery({ 
    path: "/api/v1/leave/types", 
    page: 1, 
    pageSize: 50,
    enabled: true
  });

  // Role-based access control
  const roles = bootstrap?.rbac?.roles || [];
  const hasSuperAdminRole = roles.includes("SUPER_ADMIN");
  const userRole = roles[0]; // Get primary role for display purposes
  const allowedRoles = [
    "SUPER_ADMIN",
    "FOUNDER",
    "HR_ADMIN",
    "FINANCE_ADMIN"
  ];

  if (!hasSuperAdminRole && !allowedRoles.includes(userRole)) {
    return <ForbiddenState />;
  }

  // Refetch when filters change
  useEffect(() => {
    refresh();
  }, [selectedMonth, selectedStatus, selectedEmployee, selectedLeaveType, refresh]);

  const filteredItems = useMemo(() => {
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.filter((r) => {
      if (selectedLeaveType && String(r?.leaveTypeCode || '') !== String(selectedLeaveType)) return false;
      if (!isInMonth(r, selectedMonth)) return false;

      const s = String(selectedStatus || '');
      if (!s) return true;
      if (s === 'PENDING_L1') return isPendingL1(r);
      if (s === 'PENDING_L2') return isPendingL2(r);
      return String(r?.status || '').toUpperCase() === s;
    });
  }, [data?.items, selectedLeaveType, selectedMonth, selectedStatus]);

  const kpis = useMemo(() => {
    const requests = filteredItems;
    return {
      total: requests.length,
      pendingL1: requests.filter((r) => isPendingL1(r)).length,
      pendingL2: requests.filter((r) => isPendingL2(r)).length,
      approved: requests.filter((r) => String(r?.status || '').toUpperCase() === 'APPROVED').length,
      rejected: requests.filter((r) => String(r?.status || '').toUpperCase() === 'REJECTED').length
    };
  }, [filteredItems]);

  const handleViewLeave = (record) => {
    setSelectedLeaveId(record.id);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedLeaveId(null);
  };

  const handleResetFilters = () => {
    setSelectedEmployee('');
    setSelectedLeaveType('');
    setSelectedStatus('');
    setSelectedMonth('');
  };

  // Handle loading and error states
  if (status === 'loading') return <LoadingState />;
  if (status === 'error') return <ErrorState onRetry={refresh} />;
  if (!filteredItems.length) {
    return (
      <div className="space-y-6">
        {/* Beautiful Header - UNCHANGED */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-xl mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Leave Overview
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Comprehensive leave management and tracking system
          </p>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{kpis.pendingL1 + kpis.pendingL2}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{kpis.approved}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{kpis.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Month Lock Banner */}
        {data?.monthLocked && (
          <div className="bg-gray-100 border border-gray-200 text-gray-600 px-4 py-3 rounded-xl">
            🔒 Leave records for this month are locked.
          </div>
        )}
        
        {/* Improved Filter Panel */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset Filters
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
              <select 
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Employees</option>
                {employeesData?.items?.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </option>
                ))}
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
                {leaveTypesData?.items?.map(type => (
                  <option key={type.id} value={type.code}>
                    {type.name}
                  </option>
                ))}
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
                <option value="PENDING_L1">Pending L1</option>
                <option value="PENDING_L2">Pending L2</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Improved Empty State */}
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Leave Requests Found</h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Try adjusting filters or selecting another month.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Beautiful Header - UNCHANGED */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-xl mb-4">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Leave Overview
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Comprehensive leave management and tracking system
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Requests</p>
              <p className="text-xl font-bold text-gray-900">{kpis.total}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Pending L1</p>
              <p className="text-xl font-bold text-yellow-600">{kpis.pendingL1}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Pending L2</p>
              <p className="text-xl font-bold text-orange-600">{kpis.pendingL2}</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Approved</p>
              <p className="text-xl font-bold text-green-600">{kpis.approved}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Rejected</p>
              <p className="text-xl font-bold text-red-600">{kpis.rejected}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Month Lock Banner */}
      {data?.monthLocked && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200 text-amber-800 px-6 py-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold">Leave Records Locked</div>
              <div className="text-sm opacity-90">Leave records for this month are locked and cannot be modified.</div>
            </div>
          </div>
        </div>
      )}

      {/* Improved Filter Panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset Filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
            <select 
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Employees</option>
              {employeesData?.items?.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeCode})
                </option>
              ))}
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
              {leaveTypesData?.items?.map(type => (
                <option key={type.id} value={type.code}>
                  {type.name}
                </option>
              ))}
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
              <option value="PENDING_L1">Pending L1</option>
              <option value="PENDING_L2">Pending L2</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Leave Records Section */}
      <CollapsibleSection title="Leave Records" defaultOpen={true}>
        <LeaveTable 
            data={filteredItems} 
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
              {leaveTypesData?.items?.map(type => (
                <li key={type.id}>• <strong>{type.name}</strong> - {type.code}</li>
              ))}
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
