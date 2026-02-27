import React, { useState, useEffect } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState, EmptyState } from '../../components/States.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { SummaryCard } from '../../components/SummaryCard.jsx';
import { PermissionDenied } from '../../components/PermissionDenied.jsx';

export function ManagerTeamTimesheetsPage() {
  const { bootstrap } = useBootstrap();
  const [teamTimesheets, setTeamTimesheets] = useState([]);
  const [summary, setSummary] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState('2026-W06'); // Default to week with data
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('SUBMITTED');
  const [refreshing, setRefreshing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingTimesheetId, setRejectingTimesheetId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const userId = bootstrap?.user?.id;
  const permissions = bootstrap?.rbac?.permissions || [];
  const hasPermission = permissions.includes('TIMESHEET_APPROVE_TEAM');

  // Permission check
  if (!hasPermission) {
    return <PermissionDenied permission="TIMESHEET_APPROVE_TEAM" />;
  }

  // Force set default week on mount
  useEffect(() => {
    console.log('Component mounted - forcing week to 2026-W06');
    setSelectedWeek('2026-W06');
    
    // Force browser to clear cache for this component
    if (window.caches) {
      window.caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('timesheet')) {
            window.caches.delete(name);
          }
        });
      });
    }
  }, []);

  // Convert week format to date format for API
  const getWeekStartDate = (weekString) => {
    console.log('getWeekStartDate called with:', weekString);
    
    if (!weekString) {
      const result = new Date().toISOString().slice(0, 10);
      console.log('No weekString, using today:', result);
      return result;
    }
    
    const match = weekString.match(/(\d{4})-W(\d{2})/);
    if (match) {
      const year = parseInt(match[1]);
      const week = parseInt(match[2]);
      
      console.log('Parsed year:', year, 'week:', week);
      
      // ISO week date calculation - fixed timezone issue
      const firstDayOfYear = new Date(year, 0, 1);
      const daysOffset = (week - 1) * 7 - firstDayOfYear.getDay() + 1; // +1 for Monday start
      const weekStartDate = new Date(year, 0, 1 + daysOffset);
      
      // Get date in local timezone to avoid timezone conversion issues
      const year_local = weekStartDate.getFullYear();
      const month_local = weekStartDate.getMonth();
      const day_local = weekStartDate.getDate();
      
      // Create date string in local timezone
      const result = `${year_local}-${String(month_local + 1).padStart(2, '0')}-${String(day_local).padStart(2, '0')}`;
      
      console.log(`Week ${weekString} converts to date: ${result}`);
      console.log('Calculation details:');
      console.log('- firstDayOfYear:', firstDayOfYear);
      console.log('- firstDayOfYear.getDay():', firstDayOfYear.getDay());
      console.log('- daysOffset:', daysOffset);
      console.log('- weekStartDate:', weekStartDate);
      console.log('- Local date components:', { year_local, month_local, day_local });
      
      return result;
    }
    
    const result = new Date().toISOString().slice(0, 10);
    console.log('Invalid format, using today:', result);
    return result;
  };

  // Fetch team timesheets
  const fetchTeamTimesheets = async () => {
    if (!userId) {
      console.log('No userId found, skipping fetch');
      return;
    }
    
    console.log('User ID:', userId);
    console.log('User permissions:', permissions);
    console.log('Has permission:', hasPermission);
    
    try {
      setLoading(true);
      setError(null);
      
      const weekStartDate = getWeekStartDate(selectedWeek);
      console.log('Fetching team timesheets for week:', weekStartDate);
      
      // Fetch team timesheets for selected week
      console.log('Making API call to:', `/api/v1/timesheets/team?week=${weekStartDate}&status=${selectedStatus}`);
      
      // Check if token exists
      const token = localStorage.getItem('jasiq_token');
      console.log('Auth token exists:', !!token);
      console.log('Token length:', token?.length || 0);
      
      try {
        console.log('Starting API call with 10 second timeout...');
        const response = await apiFetch(`/api/v1/timesheets/team?week=${weekStartDate}&status=${encodeURIComponent(selectedStatus)}`);
        console.log('Team timesheets API response received:', response);
        
        const allRecords = response.records || [];
        let timesheetsData = allRecords;
        console.log('Timesheets data before filtering:', timesheetsData);
        console.log('Response structure:', {
          hasRecords: !!response.records,
          recordsLength: response.records?.length,
          responseType: typeof response,
          responseKeys: Object.keys(response)
        });

        // Calculate summary from all records (not only filtered list)
        const pending = allRecords.filter(ts => ts.status === 'SUBMITTED').length;
        const approved = allRecords.filter(ts => ts.status === 'APPROVED').length;
        const rejected = allRecords.filter(ts => ts.status === 'REJECTED').length;
        setSummary({ pending, approved, rejected });
        console.log('Summary set:', { pending, approved, rejected });

        // Filter by selected status (backend already filters, this is a safe guard)
        if (selectedStatus && selectedStatus.toLowerCase() !== 'all') {
          timesheetsData = timesheetsData.filter(ts => ts.status === selectedStatus);
        }
        console.log('Timesheets data after status filter:', timesheetsData);
        
        // Filter by selected employee
        if (selectedEmployee !== 'all') {
          timesheetsData = timesheetsData.filter(ts => ts.employeeId === selectedEmployee);
        }
        
        console.log('Final timesheets data to set:', timesheetsData);
        setTeamTimesheets(timesheetsData);
      } catch (apiError) {
        console.error('API call failed:', apiError);
        throw apiError;
      }
    } catch (err) {
      console.error('Failed to fetch team timesheets:', err);
      if (err.status === 403) {
        setError('You do not have permission to view team timesheets. Required permission: TIMESHEET_APPROVE_TEAM');
      } else {
        setError(err.message || 'Failed to load team timesheets');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data - fixed duplicate
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTeamTimesheets();
  };

  // Approve timesheet
  const handleApprove = async (timesheetId) => {
    try {
      await apiFetch(`/api/v1/timesheets/${timesheetId}/approve`, {
        method: 'POST',
        body: { action: 'approve' }
      });
      await fetchTeamTimesheets();
    } catch (err) {
      console.error('Failed to approve timesheet:', err);
    }
  };

  // Reject timesheet
  const handleReject = async (timesheetId) => {
    setRejectingTimesheetId(timesheetId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectingTimesheetId) return;

    const reason = String(rejectReason || '').trim();
    if (!reason) {
      setError('Reject reason is required');
      return;
    }

    try {
      setError(null);
      await apiFetch(`/api/v1/timesheets/${rejectingTimesheetId}/reject`, {
        method: 'POST',
        body: { action: 'reject', reason }
      });
      setShowRejectModal(false);
      setRejectingTimesheetId(null);
      setRejectReason('');
      await fetchTeamTimesheets();
    } catch (err) {
      console.error('Failed to reject timesheet:', err);
      setError(err?.message || 'Failed to reject timesheet');
    }
  };

  const cancelReject = () => {
    setShowRejectModal(false);
    setRejectingTimesheetId(null);
    setRejectReason('');
  };

  useEffect(() => {
    console.log('useEffect triggered - userId:', userId, 'selectedWeek:', selectedWeek);
    fetchTeamTimesheets();
  }, [userId, selectedWeek, selectedEmployee, selectedStatus]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getTotalHours = (timesheet) => {
    return timesheet.entries?.reduce((total, entry) => total + (entry.hours || 0), 0) || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Team Timesheets" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Team Timesheets" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorState error={error} />
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
    <PageHeader title="Team Timesheet Approvals" />
    
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-slate-600">Pending</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{summary.pending}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-slate-600">Approved</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{summary.approved}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 sm:p-6 hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-slate-600">Rejected</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{summary.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex items-center mb-4">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <option value="all">All Employees</option>
              {teamTimesheets
                .filter((timesheet, index, self) => 
                  self.findIndex(t => t.employeeId === timesheet.employeeId) === index
                )
                .map(timesheet => (
                  <option key={timesheet.employeeId} value={timesheet.employeeId}>
                    {timesheet.employeeName}
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <option value="all">All</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Week Range
            </label>
            <input
              type="week"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-sm hover:shadow-md text-sm font-medium"
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

      {/* Approval Queue Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200/60 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Approval Queue
            </h3>
            <span className="text-xs sm:text-sm text-slate-500">
              {teamTimesheets.length} {teamTimesheets.length === 1 ? 'timesheet' : 'timesheets'}
            </span>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8">
            <LoadingState />
          </div>
        ) : teamTimesheets.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No timesheets found</h3>
            <p className="text-slate-600">No submitted timesheets requiring approval.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <table className="w-full divide-y divide-slate-200/60">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Employee
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">
                      Employee Code
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Week Range
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Total Hours
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
                      Submitted On
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">
                      Approval Level
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200/40">
                  {teamTimesheets.map((timesheet) => (
                    <tr key={timesheet.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        <div className="flex items-center">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-100 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                            <span className="text-xs font-medium text-slate-600">
                              {timesheet.employeeName?.charAt(0)?.toUpperCase() || 'E'}
                            </span>
                          </div>
                          <div className="truncate max-w-[120px] sm:max-w-none">
                            {timesheet.employeeName}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-slate-600 hidden sm:table-cell">
                        {timesheet.employeeCode || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-slate-600">
                        <div className="truncate max-w-[100px] sm:max-w-none">
                          {timesheet.weekStart ? `${formatDate(timesheet.weekStart)} - ${formatDate(timesheet.weekEnd)}` : selectedWeek}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-slate-600">
                        <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {getTotalHours(timesheet)}h
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-slate-600 hidden lg:table-cell">
                        {timesheet.submittedAt ? formatDate(timesheet.submittedAt) : 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        {getStatusBadge(timesheet.status)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-slate-600 hidden md:table-cell">
                        <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200/60">
                          L1
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                        {timesheet.status === 'SUBMITTED' ? (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                            <button
                              onClick={() => handleApprove(timesheet.id)}
                              className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-xs font-medium border border-green-200/60"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="hidden sm:inline">Approve</span>
                              <span className="sm:hidden">✓</span>
                            </button>
                            <button
                              onClick={() => handleReject(timesheet.id)}
                              className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium border border-red-200/60"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="hidden sm:inline">Reject</span>
                              <span className="sm:hidden">×</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md sm:max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200/60 overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200/60 bg-slate-50/50">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Reject Timesheet
              </h3>
              <p className="text-sm text-slate-600 mt-1">Please provide a reason for rejection.</p>
            </div>
            <div className="px-4 sm:px-6 py-3 sm:py-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-sm"
                placeholder="Enter rejection reason..."
              />
            </div>
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200/60 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
              <button
                onClick={cancelReject}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium shadow-sm hover:shadow-md text-sm order-1 sm:order-2"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
