import React, { useEffect, useState } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';

export function EmployeeDashboard() {
  const { bootstrap } = useBootstrap();
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [timesheets, setTimesheets] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState(null);
  const [notices, setNotices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        
        // Fetch current employee's own data
        const employeeResponse = await apiFetch('/api/v1/employees/me');
        setEmployee(employeeResponse.item || employeeResponse);
        
        // Fetch today's attendance data
        // Get current date in local timezone (YYYY-MM-DD format)
        const today = new Date().toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
        
        try {
          const attendanceResponse = await apiFetch(`/api/v1/attendance/me?month=${new Date().toISOString().slice(0, 7)}`);
          const attendanceRecords = attendanceResponse.items || [];
          const todayAttendance = attendanceRecords.find(record => record.attendanceDate === today);
          setAttendance(todayAttendance);
        } catch (attendanceErr) {
          console.warn('Failed to fetch attendance:', attendanceErr);
          setAttendance(null);
        }
        
        // Fetch timesheet data for this week
        try {
          // Use the same logic as EmployeeTimesheets page
          const timesheetResponse = await apiFetch('/api/v1/timesheets/me');
          const timesheetsData = timesheetResponse.items || timesheetResponse || [];
          
          let currentWeekData = null;
          
          if (timesheetsData.length > 0) {
            // Priority 1: Find latest DRAFT timesheet
            const draftTimesheet = timesheetsData.find(ts => ts.status === 'DRAFT');
            if (draftTimesheet) {
              currentWeekData = draftTimesheet;
            } else {
              // Priority 2: If no draft, find most recent timesheet
              currentWeekData = timesheetsData[0]; // Assuming API returns sorted by date
            }
          }
          
          if (currentWeekData) {
            // Fetch full timesheet details to get accurate status
            const detailResponse = await apiFetch(`/api/v1/timesheets/me/${currentWeekData.id}`);
            const data = detailResponse.item || detailResponse;
            const header = data?.header || data;
            
            setTimesheets({
              weeklyStatus: header?.status || 'DRAFT',
              weekStart: header?.periodStart || currentWeekData.weekStart
            });
          } else {
            // No timesheet exists
            setTimesheets({ weeklyStatus: null, weekStart: null });
          }
        } catch (timesheetErr) {
          console.warn('Failed to fetch timesheets:', timesheetErr);
          setTimesheets({ weeklyStatus: null, weekStart: null });
        }
        
        // Fetch leave balance
        try {
          const leaveResponse = await apiFetch('/api/v1/leave/balance/me');
          setLeaveBalance(leaveResponse);
        } catch (leaveErr) {
          console.warn('Failed to fetch leave balance:', leaveErr);
          setLeaveBalance({ items: [] });
        }

        // Fetch leave types
        try {
          const typesResponse = await apiFetch('/api/v1/leave/types');
          const types = Array.isArray(typesResponse?.items) ? typesResponse.items : Array.isArray(typesResponse) ? typesResponse : [];
          setLeaveTypes(types);
        } catch (typesErr) {
          console.warn('Failed to fetch leave types:', typesErr);
          setLeaveTypes([]);
        }
        
        // Fetch notices
        try {
          const noticesResponse = await apiFetch('/api/v1/communications/notices');
          setNotices(noticesResponse);
        } catch (noticesErr) {
          console.warn('Failed to fetch notices:', noticesErr);
          setNotices({ items: [] });
        }
        
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading your dashboard…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState error={error} />
      </div>
    );
  }

  const formatName = (emp) => {
    if (!emp) return '—';
    return `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'ON_HOLD':
        return 'On-hold';
      case 'EXITED':
        return 'Exited';
      default:
        return status || '—';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'ON_HOLD':
        return 'bg-amber-100 text-amber-800';
      case 'EXITED':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getAttendanceStatusColor = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-emerald-100 text-emerald-800';
      case 'ABSENT':
        return 'bg-rose-100 text-rose-800';
      case 'LEAVE':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getAttendanceStatusText = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'Present';
      case 'ABSENT':
        return 'Absent';
      case 'LEAVE':
        return 'On Leave';
      default:
        return 'Not Marked';
    }
  };

  const getTimesheetStatusText = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'Draft';
      case 'SUBMITTED':
        return 'Submitted';
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      default:
        return 'No submission yet';
    }
  };

  const getTimesheetStatusColor = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getLeaveBalanceText = (balance) => {
    if (!balance || !Array.isArray(balance.items)) {
      return '0 days';
    }

    const typeCodes = Array.isArray(leaveTypes) && leaveTypes.length > 0
      ? leaveTypes.map((t) => String(t.code || '').toUpperCase()).filter(Boolean)
      : null;

    const filteredBalances = typeCodes
      ? balance.items.filter((lb) => typeCodes.includes(String(lb.leaveTypeCode || '').toUpperCase()))
      : balance.items;

    const totalDays = filteredBalances.reduce((sum, lb) => sum + (typeof lb.availableDays === 'number' ? lb.availableDays : 0), 0);
    return `${totalDays} days`;
  };

  const getLeaveTypesText = (balance) => {
    if (!balance || !Array.isArray(balance.items)) {
      return 'Annual leave';
    }

    const typeMap = new Map(
      (Array.isArray(leaveTypes) ? leaveTypes : []).map((t) => [String(t.code || '').toUpperCase(), t])
    );

    const filteredBalances = Array.isArray(leaveTypes) && leaveTypes.length > 0
      ? balance.items.filter((lb) => typeMap.has(String(lb.leaveTypeCode || '').toUpperCase()))
      : balance.items;

    const availableTypes = filteredBalances
      .filter((lb) => (lb.availableDays || 0) > 0)
      .map((lb) => {
        const code = String(lb.leaveTypeCode || '').toUpperCase();
        const t = typeMap.get(code);
        return t?.displayName || t?.name || lb.leaveTypeName || lb.leaveTypeCode;
      })
      .slice(0, 2);
    
    if (availableTypes.length === 0) {
      return 'Annual leave';
    } else if (availableTypes.length === 1) {
      return availableTypes[0];
    } else {
      return `${availableTypes[0]} + ${availableTypes.length - 1} more`;
    }
  };

  const getNoticesText = (noticesData) => {
    if (!noticesData || !Array.isArray(noticesData.items)) {
      return 'No new notices';
    }
    const unreadCount = noticesData.items.filter(notice => !notice.read).length;
    if (unreadCount === 0) {
      return 'No new notices';
    }
    return `${unreadCount} new notice${unreadCount > 1 ? 's' : ''}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Employment Information Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Employment Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-sm font-medium text-slate-500">Employee ID</div>
            <div className="mt-1 text-sm text-slate-900 font-mono">{employee?.employeeCode || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Designation</div>
            <div className="mt-1 text-sm text-slate-900">{employee?.designation || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Reporting Manager</div>
            <div className="mt-1 text-sm text-slate-900">{employee?.reportingManager || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Employment Status</div>
            <div className="mt-1">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(employee?.status)}`}>
                {getStatusLabel(employee?.status)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Attendance Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">📅</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Attendance</h3>
                <p className="text-sm text-slate-600">Today</p>
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getAttendanceStatusColor(attendance?.status)}`}>
                {getAttendanceStatusText(attendance?.status)}
              </span>
              {attendance?.markedAt && (
                <span className="text-xs text-slate-500">
                  at {new Date(attendance.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {attendance?.status 
                ? `Marked via ${attendance.source?.toLowerCase() || 'system'}`
                : 'Mark your attendance for today'
              }
            </div>
          </div>
        </div>

        {/* Timesheets Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">📊</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Timesheets</h3>
                <p className="text-sm text-slate-600">This week</p>
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTimesheetStatusColor(timesheets?.weeklyStatus)}`}>
                {getTimesheetStatusText(timesheets?.weeklyStatus)}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {timesheets?.weeklyStatus 
                ? `Week of ${timesheets.weekStart || 'this week'}`
                : 'Submit your weekly timesheet'
              }
            </div>
          </div>
        </div>

        {/* Leave Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">✈️</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Leave</h3>
                <p className="text-sm text-slate-600">Balance</p>
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-700">
            <div className="font-medium">{getLeaveBalanceText(leaveBalance)}</div>
            <div className="text-xs text-slate-500 mt-1">
              {getLeaveTypesText(leaveBalance)} available
            </div>
          </div>
        </div>

        {/* Notices Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">📢</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Notices</h3>
                <p className="text-sm text-slate-600">Updates</p>
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-700">
            <div className="font-medium">{getNoticesText(notices)}</div>
            <div className="text-xs text-slate-500 mt-1">
              {notices?.items?.length > 0 
                ? `${notices.items.length} total notice${notices.items.length > 1 ? 's' : ''}`
                : 'Check back later for updates'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info Section */}
      <div className="mt-8 bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Quick Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium text-slate-700">Joining Date</div>
            <div className="text-slate-600">
              {employee?.createdAt ? new Date(employee.createdAt).toLocaleDateString() : '—'}
            </div>
          </div>
          <div>
            <div className="font-medium text-slate-700">Email</div>
            <div className="text-slate-600">{employee?.email || '—'}</div>
          </div>
          <div>
            <div className="font-medium text-slate-700">Phone</div>
            <div className="text-slate-600">{employee?.phone || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
