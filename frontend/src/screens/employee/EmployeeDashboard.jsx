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
          setTimesheets({ weeklyStatus: null, weekStart: null });
        }
        
        // Fetch leave balance
        try {
          const leaveResponse = await apiFetch('/api/v1/leave/balance/me');
          setLeaveBalance(leaveResponse);
        } catch (leaveErr) {
          setLeaveBalance({ items: [] });
        }

        // Fetch leave types
        try {
          const typesResponse = await apiFetch('/api/v1/leave/types');
          const types = Array.isArray(typesResponse?.items) ? typesResponse.items : Array.isArray(typesResponse) ? typesResponse : [];
          setLeaveTypes(types);
        } catch (typesErr) {
          setLeaveTypes([]);
        }
        
        // Fetch notices
        try {
          const noticesResponse = await apiFetch('/api/v1/communications/notices');
          setNotices(noticesResponse);
        } catch (noticesErr) {
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
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Section - SuperAdmin Style */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-12 text-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-bold uppercase tracking-wider text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                Employee Portal
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Welcome back, <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">{employee?.firstName || 'User'}</span>!
              </h1>
              <p className="text-slate-400 text-lg max-w-xl font-medium">
                Here's what's happening with your {bootstrap?.systemConfig?.ORGANIZATION_NAME?.value || 'workspace'} today. Stay productive and have a great day!
              </p>
            </div>
            
            {/* Summary Statistics - SuperAdmin Style */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-40">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${employee?.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                  <span className="text-lg font-bold">{getStatusLabel(employee?.status)}</span>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-40">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Emp ID</div>
                <div className="text-lg font-mono font-bold text-blue-400">{employee?.employeeCode || '—'}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Secondary Info Bar */}
        <div className="bg-slate-50 border-t border-slate-100 p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Designation</div>
              <div className="text-sm font-bold text-slate-900">{employee?.designation || '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reporting Manager</div>
              <div className="text-sm font-bold text-slate-900">{employee?.reportingManagerName || '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email</div>
              <div className="text-sm font-bold text-slate-900 truncate max-w-[180px]">{employee?.email || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access - SuperAdmin Grid Style */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Quick Actions</h2>
          <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-transparent rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <a href="/employee/attendance" className="group p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-blue-600 hover:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:bg-white/20 transition-colors">
              <span className="text-2xl">📅</span>
            </div>
            <h3 className="font-bold text-slate-900 group-hover:text-white transition-colors">Mark Attendance</h3>
            <p className="text-sm text-slate-500 group-hover:text-blue-100 mt-1">Status: <span className="font-bold">{getAttendanceStatusText(attendance?.status)}</span></p>
          </a>

          <a href="/employee/timesheets" className="group p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-indigo-600 hover:border-indigo-500 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:bg-white/20 transition-colors">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-bold text-slate-900 group-hover:text-white transition-colors">My Timesheets</h3>
            <p className="text-sm text-slate-500 group-hover:text-indigo-100 mt-1">Status: <span className="font-bold">{getTimesheetStatusText(timesheets?.weeklyStatus)}</span></p>
          </a>

          <a href="/employee/leave" className="group p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-emerald-600 hover:border-emerald-500 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:bg-white/20 transition-colors">
              <span className="text-2xl">✈️</span>
            </div>
            <h3 className="font-bold text-slate-900 group-hover:text-white transition-colors">Apply Leave</h3>
            <p className="text-sm text-slate-500 group-hover:text-emerald-100 mt-1">Balance: <span className="font-bold">{getLeaveBalanceText(leaveBalance)}</span></p>
          </a>

          <a href="/employee/expenses" className="group p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-amber-600 hover:border-amber-500 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:bg-white/20 transition-colors">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="font-bold text-slate-900 group-hover:text-white transition-colors">My Expenses</h3>
            <p className="text-sm text-slate-500 group-hover:text-amber-100 mt-1">Submit & track claims</p>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Notices & Announcements */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">📢</span>
              </div>
              <h2 className="font-bold text-slate-900">Latest Notices</h2>
            </div>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-lg">Official</span>
          </div>
          <div className="p-6 space-y-4 flex-1">
            {notices?.items?.length > 0 ? (
              notices.items.slice(0, 3).map((notice, idx) => (
                <div key={notice.id || idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md transition-all duration-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900">{notice.title}</h4>
                      <p className="text-sm text-slate-600 line-clamp-2">{notice.content}</p>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 whitespace-nowrap mt-1">
                      {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl opacity-50">📭</span>
                </div>
                <h3 className="font-bold text-slate-900">No new notices</h3>
                <p className="text-sm text-slate-500 max-w-[200px] mt-1">Everything is up to date! Check back later for announcements.</p>
              </div>
            )}
          </div>
          <div className="p-4 bg-slate-50/50 border-t border-slate-100">
            <button className="w-full py-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">View All Announcements</button>
          </div>
        </div>

        {/* Quick Help Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-xl">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black mb-3">Need Assistance?</h3>
            <p className="text-blue-100 font-medium mb-8">Our help center is available 24/7 with policies and guidance for all your needs.</p>
          </div>
          <a href="/employee/help" className="relative z-10 w-full py-4 bg-white text-blue-700 font-black rounded-2xl text-center shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
            Visit Help Center
          </a>
        </div>
      </div>
    </div>
  );
}
