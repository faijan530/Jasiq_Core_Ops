import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useBootstrap } from '../../state/bootstrap.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { apiFetch } from '../../api/client.js';
import { getEmployeeBasePath } from '../../utils/roleRouting.js';

export function HrDashboard() {
  const navigate = useNavigate();
  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];

  // Permission checks
  const canReadEmployees = permissions.includes('EMPLOYEE_READ');
  const canReadLeaveRequests = permissions.includes('LEAVE_REQUEST_READ');
  const canCorrectAttendance = permissions.includes('ATTENDANCE_CORRECT');
  const canOverrideLeave = permissions.includes('LEAVE_OVERRIDE');

  // Fetch real data for dashboard metrics
  const [pendingLeaveApprovals, setPendingLeaveApprovals] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [attendanceCorrectionsPending, setAttendanceCorrectionsPending] = useState(0);
  const [leaveOverridesThisMonth, setLeaveOverridesThisMonth] = useState(0);
  const [monthStatus, setMonthStatus] = useState({ status: 'open', message: 'Month is open for corrections' });
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

        // Fetch pending leave approvals
        if (canReadLeaveRequests) {
          try {
            const leaveData = await apiFetch('/api/v1/leave/requests?status=PENDING&limit=1');
            setPendingLeaveApprovals(leaveData?.total || 0);
          } catch (err) {
            console.warn('Failed to fetch leave approvals:', err);
          }
        }

        // Fetch total employees
        if (canReadEmployees) {
          try {
            const employeeData = await apiFetch('/api/v1/employees?limit=1');
            setTotalEmployees(employeeData?.total || 0);
          } catch (err) {
            console.warn('Failed to fetch employees:', err);
          }
        }

        // Fetch attendance corrections needing HR attention
        if (canCorrectAttendance) {
          try {
            // Fetch current month's attendance to see corrections needed
            const currentMonth = new Date().toISOString().slice(0, 7);
            const attendanceData = await apiFetch(`/api/v1/attendance/hr-month?month=${currentMonth}`);
            
            console.log('[HR Dashboard] Raw attendance data:', attendanceData);
            
            // Handle different response formats - look for attendance records array
            let attendanceItems = [];
            
            if (attendanceData?.records && Array.isArray(attendanceData.records)) {
              attendanceItems = attendanceData.records;
            } else if (attendanceData?.items && Array.isArray(attendanceData.items)) {
              attendanceItems = attendanceData.items;
            } else if (attendanceData?.attendances && Array.isArray(attendanceData.attendances)) {
              attendanceItems = attendanceData.attendances;
            } else if (Array.isArray(attendanceData)) {
              attendanceItems = attendanceData;
            } else {
              console.warn('[HR Dashboard] No attendance records array found in response');
              setAttendanceCorrectionsPending(0);
              return;
            }
            
            // Count attendance records that might need attention (e.g., absences, manual entries)
            const correctionsNeeded = attendanceItems.filter(record => {
              const recordStr = JSON.stringify(record).toLowerCase();
              return record?.status === 'ABSENT' || 
                     record?.source === 'MANUAL' || 
                     recordStr.includes('override') ||
                     recordStr.includes('manual');
            }).length;
            
            setAttendanceCorrectionsPending(correctionsNeeded);
            console.log('[HR Dashboard] Attendance corrections calculated:', {
              totalRecords: attendanceItems.length,
              correctionsNeeded,
              month: currentMonth,
              sampleRecords: attendanceItems.slice(0, 3)
            });
          } catch (err) {
            console.warn('Failed to fetch attendance corrections:', err);
            setAttendanceCorrectionsPending(0);
          }
        }

        // Fetch leave overrides this month
        if (canOverrideLeave) {
          try {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const overrideData = await apiFetch(`/api/v1/leave/requests?month=${currentMonth}&override=true&limit=1`);
            setLeaveOverridesThisMonth(overrideData?.total || 0);
          } catch (err) {
            console.warn('Failed to fetch leave overrides:', err);
            setLeaveOverridesThisMonth(0);
          }
        }

        // Fetch month close status
        try {
          const monthData = await apiFetch(`/api/v1/governance/month-close?month=${currentMonth}`);
          if (monthData?.isClosed) {
            setMonthStatus({ status: 'locked', message: 'Month is locked - corrections disabled' });
          } else {
            // Check if month is closing soon (e.g., within 3 days)
            const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
            const today = new Date();
            const daysUntilClose = Math.ceil((lastDay - today) / (1000 * 60 * 60 * 24));
            
            if (daysUntilClose <= 3) {
              setMonthStatus({ status: 'closing', message: `Month closes in ${daysUntilClose} days` });
            } else {
              setMonthStatus({ status: 'open', message: 'Month is open for corrections' });
            }
          }
        } catch (err) {
          console.warn('Failed to fetch month close status:', err);
          setMonthStatus({ status: 'open', message: 'Month is open for corrections' });
        }

        // Generate critical alerts
        const alerts = [];
        if (canReadLeaveRequests && pendingLeaveApprovals > 0) {
          alerts.push(`${pendingLeaveApprovals} pending L2 leave approval${pendingLeaveApprovals === 1 ? '' : 's'} require attention`);
        }
        if (monthStatus.status === 'closing') {
          alerts.push('Month close approaching - submit corrections soon');
        }
        if (monthStatus.status === 'locked' && canCorrectAttendance) {
          alerts.push('Month locked - attendance corrections disabled');
        }
        
        setCriticalAlerts(alerts);
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [canReadEmployees, canReadLeaveRequests, canCorrectAttendance, canOverrideLeave, pendingLeaveApprovals]);

  // Listen for attendance updates to refresh dashboard data
  useEffect(() => {
    const handleAttendanceUpdate = (event) => {
      console.log('[HR Dashboard] Received attendance update event:', event.detail);
      
      // Force immediate refresh of attendance corrections
      if (canCorrectAttendance) {
        const fetchAttendanceCorrections = async () => {
          try {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const attendanceData = await apiFetch(`/api/v1/attendance/hr-month?month=${currentMonth}`);
            
            console.log('[HR Dashboard] Event refresh - Raw attendance data:', attendanceData);
            
            // Handle different response formats - look for attendance records array
            let attendanceItems = [];
            
            if (attendanceData?.records && Array.isArray(attendanceData.records)) {
              attendanceItems = attendanceData.records;
            } else if (attendanceData?.items && Array.isArray(attendanceData.items)) {
              attendanceItems = attendanceData.items;
            } else if (attendanceData?.attendances && Array.isArray(attendanceData.attendances)) {
              attendanceItems = attendanceData.attendances;
            } else if (Array.isArray(attendanceData)) {
              attendanceItems = attendanceData;
            } else {
              console.warn('[HR Dashboard] Event refresh - No attendance records array found');
              return;
            }
            
            const correctionsNeeded = attendanceItems.filter(record => {
              const recordStr = JSON.stringify(record).toLowerCase();
              return record?.status === 'ABSENT' || 
                     record?.source === 'MANUAL' || 
                     recordStr.includes('override') ||
                     recordStr.includes('manual');
            }).length;
            
            console.log('[HR Dashboard] Event refresh - Updated attendance corrections:', correctionsNeeded);
            setAttendanceCorrectionsPending(correctionsNeeded);
          } catch (err) {
            console.warn('Failed to refresh attendance corrections:', err);
          }
        };
        
        fetchAttendanceCorrections();
      }
      
      // Full data refresh
      fetchDashboardData();
    };

    window.addEventListener('attendanceDataUpdated', handleAttendanceUpdate);

    return () => {
      window.removeEventListener('attendanceDataUpdated', handleAttendanceUpdate);
    };
  }, [canReadEmployees, canReadLeaveRequests, canCorrectAttendance, canOverrideLeave]);

  // Navigation handlers with error handling
  const handleNavigate = (path) => {
    try {
      console.log('Navigating to:', path);
      navigate(path);
    } catch (error) {
      console.error('Navigation failed:', error);
      // Fallback: use window.location if navigate fails
      window.location.href = path;
    }
  };

  // Always show dashboard, never crash due to errors
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {canReadEmployees && (
          <div
            onClick={() => handleNavigate(getEmployeeBasePath(bootstrap?.rbac?.roles))}
            className="group cursor-pointer rounded-xl border border-slate-200 p-4 text-center transition-all duration-200 hover:shadow-lg hover:border-blue-300 hover:bg-blue-50"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition-colors">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Employees</h3>
            <p className="text-sm text-slate-600 mt-1">Manage employees</p>
            {totalEmployees > 0 && (
              <p className="text-2xl font-bold text-slate-900 mt-2">{totalEmployees}</p>
            )}
          </div>
        )}

        {canReadLeaveRequests && (
          <div
            onClick={() => handleNavigate('/hr/governance/leave-balances')}
            className="group cursor-pointer rounded-xl border border-slate-200 p-4 text-center transition-all duration-200 hover:shadow-lg hover:border-emerald-300 hover:bg-emerald-50"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-200 transition-colors">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">Leave Balances</h3>
            <p className="text-sm text-slate-600 mt-1">Manage leave balances</p>
            {pendingLeaveApprovals > 0 && (
              <p className="text-2xl font-bold text-emerald-600 mt-2">{pendingLeaveApprovals}</p>
            )}
          </div>
        )}

        {canCorrectAttendance && (
          <div
            onClick={() => handleNavigate('/hr/attendance')}
            className="group cursor-pointer rounded-xl border border-slate-200 p-4 text-center transition-all duration-200 hover:shadow-lg hover:border-purple-300 hover:bg-purple-50"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 transition-colors">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">Attendance</h3>
            <p className="text-sm text-slate-600 mt-1">Correct attendance</p>
            {attendanceCorrectionsPending > 0 && (
              <p className="text-2xl font-bold text-purple-600 mt-2">{attendanceCorrectionsPending}</p>
            )}
          </div>
        )}

        {permissions.includes('LEAVE_MONTH_CLOSE_OVERRIDE') && (
          <div
            onClick={() => handleNavigate('/hr/governance/month-close')}
            className="group cursor-pointer rounded-xl border border-slate-200 p-4 text-center transition-all duration-200 hover:shadow-lg hover:border-amber-300 hover:bg-amber-50"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-amber-200 transition-colors">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">Month Close</h3>
            <p className="text-sm text-slate-600 mt-1">Close month</p>
            <div className={`mt-2 px-2 py-1 rounded-full text-xs font-medium ${
              monthStatus.status === 'locked' 
                ? 'bg-red-100 text-red-700' 
                : monthStatus.status === 'warning'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {monthStatus.status}
            </div>
          </div>
        )}
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-semibold text-amber-900 mb-2">Critical Alerts</h3>
          <ul className="space-y-1">
            {criticalAlerts.map((alert, index) => (
              <li key={index} className="text-sm text-amber-800">• {alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Month Status Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-4">Month Status</h3>
        <div className={`p-4 rounded-lg ${
          monthStatus.status === 'locked' 
            ? 'bg-red-50 border border-red-200' 
            : monthStatus.status === 'warning'
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              monthStatus.status === 'locked' 
                ? 'bg-red-500' 
                : monthStatus.status === 'warning'
                ? 'bg-amber-500'
                : 'bg-green-500'
            }`}></div>
            <p className="text-slate-900 font-medium">{monthStatus.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
