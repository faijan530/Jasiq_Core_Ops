import React, { useState, useEffect } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState, EmptyState } from '../../components/States.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { SummaryCard } from '../../components/SummaryCard.jsx';
import { PermissionDenied } from '../../components/PermissionDenied.jsx';

export function ManagerTeamAttendancePage() {
  const { bootstrap } = useBootstrap();
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [summary, setSummary] = useState({ totalEmployees: 0, presentCount: 0, absentCount: 0, leaveCount: 0 });
  const [monthAttendance, setMonthAttendance] = useState([]);
  const [monthSummary, setMonthSummary] = useState({ totalEmployees: 0, presentCount: 0, absentCount: 0, leaveCount: 0 });
  const [monthBounds, setMonthBounds] = useState({ startDate: null, endDate: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const userId = bootstrap?.user?.id;
  const permissions = bootstrap?.rbac?.permissions || [];
  const hasPermission = permissions.includes('ATTENDANCE_VIEW_TEAM');

  // Permission check
  if (!hasPermission) {
    return <PermissionDenied permission="ATTENDANCE_VIEW_TEAM" />;
  }

  // Convert week format to date format for API
  const getWeekStartDate = (weekString) => {
    if (!weekString) {
      // Default to current week start
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(now.setDate(diff)).toISOString().slice(0, 10);
    }
    
    const match = weekString.match(/(\d{4})-W(\d{2})/);
    if (match) {
      const year = parseInt(match[1]);
      const week = parseInt(match[2]);
      
      const firstDayOfYear = new Date(year, 0, 1);
      const daysOffset = (week - 1) * 7 - firstDayOfYear.getDay();
      const weekStartDate = new Date(year, 0, 1 + daysOffset);
      return weekStartDate.toISOString().slice(0, 10);
    }
    
    return weekString;
  };

  // Initialize with current week
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const week = Math.ceil((((now - new Date(year, 0, 1)) / 86400000) + now.getDay() + 1) / 7);
    const weekString = `${year}-W${String(week).padStart(2, '0')}`;
    setSelectedWeek(weekString);
  }, []);

  // Fetch team members and attendance
  const fetchTeamData = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const weekStartDate = getWeekStartDate(selectedWeek);
      
      // Fetch team attendance for selected week
      const attendanceResponse = await apiFetch(`/api/v1/attendance/team?week=${weekStartDate}`);
      const members = attendanceResponse.employees || [];
      setTeamMembers(members);

      let attendanceData = attendanceResponse.records || [];
      
      // Filter by selected employee
      if (selectedEmployee !== 'all') {
        attendanceData = attendanceData.filter(a => a.employeeId === selectedEmployee);
      }
      
      setTeamAttendance(attendanceData);
      
      // Calculate summary from API response
      if (attendanceResponse.summary) {
        setSummary(attendanceResponse.summary);
      }

      // Fetch month overview (month start/end + counts)
      const monthResponse = await apiFetch(`/api/v1/attendance/team-month?month=${selectedMonth}`);
      const monthItems = monthResponse.items || [];
      setMonthAttendance(
        selectedEmployee === 'all'
          ? monthItems
          : monthItems.filter((a) => a.employeeId === selectedEmployee)
      );
      setMonthSummary(monthResponse.summary || { totalEmployees: 0, presentCount: 0, absentCount: 0, leaveCount: 0 });
      setMonthBounds({ startDate: monthResponse.startDate || null, endDate: monthResponse.endDate || null });
    } catch (err) {
      console.error('Failed to fetch team data:', err);
      if (err.status === 403) {
        setError('You do not have permission to view team attendance. Required permission: ATTENDANCE_VIEW_TEAM');
      } else {
        setError(err.message || 'Failed to load team data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTeamData();
  };

  useEffect(() => {
    fetchTeamData();
  }, [userId, selectedWeek, selectedMonth, selectedEmployee]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const styles = {
      PRESENT: 'bg-green-100 text-green-800',
      ABSENT: 'bg-red-100 text-red-800',
      LATE: 'bg-yellow-100 text-yellow-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      PRESENT: 'bg-green-100 text-green-800',
      ABSENT: 'bg-red-100 text-red-800',
      LATE: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getAttendanceStats = () => {
    // Use summary from API response if available, otherwise calculate from data
    if (summary.totalEmployees !== undefined) {
      return {
        total: summary.totalEmployees,
        present: summary.presentCount,
        absent: summary.absentCount,
        late: teamAttendance.filter(a => a.status === 'LATE').length,
        onLeave: teamAttendance.filter(a => a.status === 'LEAVE').length
      };
    }
    
    // Fallback to calculating from data
    const total = teamAttendance.length;
    const present = teamAttendance.filter(a => a.status === 'PRESENT').length;
    const absent = teamAttendance.filter(a => a.status === 'ABSENT').length;
    const late = teamAttendance.filter(a => a.status === 'LATE').length;
    const onLeave = teamAttendance.filter(a => a.status === 'LEAVE').length;
    
    return { total, present, absent, late, onLeave };
  };

  const stats = getAttendanceStats();

  const monthCards = (() => {
    const items = monthAttendance || [];
    const norm = (s) => String(s || '').toUpperCase();
    return {
      totalEmployees: teamMembers.length,
      presentCount: items.filter((a) => norm(a.status) === 'PRESENT').length,
      absentCount: items.filter((a) => norm(a.status) === 'ABSENT').length,
      leaveCount: items.filter((a) => norm(a.status) === 'LEAVE').length
    };
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Team Attendance" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Team Attendance" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorState error={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Team Attendance" subtitle="Month Overview" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Total Employees"
            value={monthCards.totalEmployees}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            color="blue"
          />
          
          <SummaryCard
            title="Present Count"
            value={monthCards.presentCount}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
          />
          
          <SummaryCard
            title="Absent Count"
            value={monthCards.absentCount}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="red"
          />
          
          <SummaryCard
            title="Leave Count"
            value={monthCards.leaveCount}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            color="amber"
          />
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Month Selector
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
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
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.employeeName || `${m.firstName || ''} ${m.lastName || ''}`.trim()}
                  </option>
                ))}
              </select>
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

        {/* Month Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Attendance Overview (Month)</h3>
              <div className="text-sm text-slate-600 mt-1">
                {monthBounds.startDate && monthBounds.endDate
                  ? `${monthBounds.startDate} to ${monthBounds.endDate}`
                  : ''}
              </div>
            </div>
          </div>

          {monthAttendance.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">No monthly attendance found</h3>
              <p className="text-slate-600">No attendance data available for the selected month.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Employee Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {monthAttendance.map((attendance, index) => (
                    <tr key={attendance.id || index} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {attendance.employeeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(attendance.attendanceDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(attendance.status)}`}>
                          {attendance.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {attendance.source || 'SYSTEM'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Attendance Records</h3>
          </div>
          
          {loading ? (
            <div className="p-8">
              <LoadingState />
            </div>
          ) : teamAttendance.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No attendance records found</h3>
              <p className="text-slate-600">No attendance data available for the selected week.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Employee Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {teamAttendance.map((attendance, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {attendance.employeeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(attendance.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(attendance.status)}`}>
                          {attendance.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {attendance.source || 'SYSTEM'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
