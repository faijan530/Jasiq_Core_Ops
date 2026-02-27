import React, { useState, useEffect } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { SummaryCard } from '../../components/SummaryCard.jsx';

export function ManagerDashboard() {
  const { bootstrap } = useBootstrap();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dashboard data
  const [teamStats, setTeamStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeaveToday: 0,
    pendingApprovals: 0
  });
  
  const [recentActivities, setRecentActivities] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [timesheetApprovals, setTimesheetApprovals] = useState([]);

  const userId = bootstrap?.user?.id;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch team statistics with individual error handling
      let attendanceResponse = { items: [] };
      let leaveResponse = [];
      let timesheetResponse = { records: [] };
      
      try {
        attendanceResponse = await apiFetch(`/api/v1/attendance/team-month?month=${currentMonth}`);
      } catch (err) {
        console.warn('Failed to fetch attendance data:', err);
      }
      
      try {
        leaveResponse = await apiFetch('/api/v1/leave/team?status=SUBMITTED');
      } catch (err) {
        console.warn('Failed to fetch leave data:', err);
      }
      
      try {
        timesheetResponse = await apiFetch(`/api/v1/timesheets/team?week=${today}&status=SUBMITTED`);
      } catch (err) {
        console.warn('Failed to fetch timesheet data:', err);
      }
      
      // Calculate team statistics with safe defaults
      const totalEmployees = new Set(attendanceResponse.items?.map(a => a.employeeId) || []).size;
      const presentToday = attendanceResponse.items?.filter(a => a.attendanceDate === today && a.status === 'PRESENT').length || 0;
      const onLeaveToday = attendanceResponse.items?.filter(a => a.attendanceDate === today && a.status === 'LEAVE').length || 0;
      const pendingApprovals = (leaveResponse?.length || 0) + (timesheetResponse.records?.filter(t => t.status === 'SUBMITTED').length || 0);
      
      setTeamStats({
        totalEmployees,
        presentToday,
        onLeaveToday,
        pendingApprovals
      });
      
      // Set recent activities
      setRecentActivities(leaveResponse?.slice(0, 5) || []);
      setLeaveRequests(leaveResponse?.slice(0, 3) || []);
      setTimesheetApprovals(timesheetResponse.records?.slice(0, 3) || []);
      
      // Calculate attendance trend for last 7 days
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);
        const dayAttendance = attendanceResponse.items?.filter(a => a.attendanceDate === dateStr) || [];
        last7Days.push({
          date: dateStr,
          present: dayAttendance.filter(a => a.status === 'PRESENT').length,
          absent: dayAttendance.filter(a => a.status === 'ABSENT').length,
          total: dayAttendance.length
        });
      }
      setAttendanceTrend(last7Days);
      
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      
      // Provide user-friendly error messages
      let userMessage = 'Unable to load dashboard data. Please try again later.';
      if (err.status === 403) {
        userMessage = 'You do not have permission to view dashboard data. Please contact your administrator.';
      } else if (err.status >= 500) {
        userMessage = 'Server is experiencing issues. Please try again in a few minutes.';
      } else if (err.code === 'NETWORK_ERROR' || !navigator.onLine) {
        userMessage = 'Network connection lost. Please check your internet connection.';
      }
      
      setError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Manager Dashboard" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Manager Dashboard" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-red-800 mb-2">Dashboard Error</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchDashboardData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Manager Dashboard" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {bootstrap?.user?.firstName || 'Manager'}!
          </h1>
          <p className="text-slate-600 mt-2">
            Here's what's happening with your team today.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Total Team Members"
            value={teamStats.totalEmployees}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            color="blue"
          />
          
          <SummaryCard
            title="Present Today"
            value={teamStats.presentToday}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
          />
          
          <SummaryCard
            title="On Leave Today"
            value={teamStats.onLeaveToday}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            color="amber"
          />
          
          <SummaryCard
            title="Pending Approvals"
            value={teamStats.pendingApprovals}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            }
            color="red"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pending Leave Requests */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Pending Leave Requests</h3>
              </div>
              <div className="p-6">
                {leaveRequests.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-600">No pending leave requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leaveRequests.map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{leave.employeeName}</p>
                          <p className="text-xs text-slate-500">{leave.days} days</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pending Timesheet Approvals */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Timesheet Approvals</h3>
              </div>
              <div className="p-6">
                {timesheetApprovals.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-600">No pending timesheets</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timesheetApprovals.map((timesheet) => (
                      <div key={timesheet.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{timesheet.employeeName}</p>
                          <p className="text-xs text-slate-500">{timesheet.totalHours || 0} hours</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Review
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Attendance Trend */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">7-Day Attendance Trend</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {attendanceTrend.map((day, index) => {
                    const attendanceRate = day.total > 0 ? Math.round((day.present / day.total) * 100) : 0;
                    return (
                      <div key={day.date} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-slate-600">
                            {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                          </span>
                          <div className="flex-1">
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${attendanceRate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                          {attendanceRate}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Mark Attendance
                </button>
                <button className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Reports
                </button>
                <button className="flex items-center justify-center px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Team Schedule
                </button>
                <button className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
