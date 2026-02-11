import React, { useEffect, useState } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';

export function EmployeeAttendance() {
  const { bootstrap } = useBootstrap();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [markingToday, setMarkingToday] = useState(false);
  const [todayMarked, setTodayMarked] = useState(false);

  useEffect(() => {
    async function fetchAttendanceData() {
      try {
        setLoading(true);
        // Fetch current employee's attendance
        const response = await apiFetch('/api/v1/attendance/me');
        const attendanceData = response.items || response || [];
        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
        setError(null);
        
        // Check if today's attendance is marked
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = attendanceData.find(record => 
          record.date && record.date.startsWith(today)
        );
        setTodayMarked(!!todayRecord);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchAttendanceData();
  }, []);

  const handleMarkAttendance = async (status) => {
    try {
      setMarkingToday(true);
      const today = new Date().toISOString().split('T')[0];
      
      await apiFetch('/api/v1/attendance/me', {
        method: 'POST',
        body: {
          date: today,
          status: status
        }
      });
      
      // Refresh attendance data
      const response = await apiFetch('/api/v1/attendance/me');
      const attendanceData = response.items || response || [];
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      setTodayMarked(true);
    } catch (err) {
      setError(err);
    } finally {
      setMarkingToday(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getAttendanceForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return attendance.find(record => record.date === dateStr);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isFutureDate = (date) => {
    return date > new Date();
  };

  const isPastDate = (date) => {
    return date < new Date().setHours(0, 0, 0, 0);
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'PRESENT':
        return { text: 'Present', icon: '✓', class: 'text-green-600 bg-green-50' };
      case 'ABSENT':
        return { text: 'Absent', icon: '—', class: 'text-gray-500 bg-gray-50' };
      case 'LEAVE':
        return { text: 'Leave', icon: 'L', class: 'text-blue-600 border border-blue-200 bg-blue-50' };
      default:
        return { text: '—', icon: '—', class: 'text-gray-400' };
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading attendance data…" />
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

  const currentDate = new Date(selectedMonth + '-01');
  const calendarDays = getDaysInMonth(currentDate);
  const today = new Date();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Global Header - Same for all screen sizes */}
      <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.history.back()}
                className="lg:hidden p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <img 
                src="/image.png" 
                alt="JASIQ" 
                className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
              />
              <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
            </div>
            <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
              <span className="text-white">Attendance</span>
              <span className="mx-2">·</span>
              <span className="text-amber-400">My Attendance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="pt-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">My Attendance</h1>
          <p className="text-slate-600">Mark your daily attendance and view history</p>
        </div>

        {/* Month Selector */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                max={new Date().toISOString().slice(0, 7)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-600">Current Month</div>
              <div className="text-lg font-semibold text-slate-900">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Today's Actions */}
        {isToday(today) && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Today's Attendance</h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600 mb-1">
                  {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="text-lg font-medium text-slate-900">
                  {todayMarked ? 'Marked for today' : 'Not marked yet'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleMarkAttendance('PRESENT')}
                  disabled={todayMarked || markingToday}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  {markingToday ? 'Marking...' : 'Present'}
                </button>
                <button
                  onClick={() => handleMarkAttendance('ABSENT')}
                  disabled={todayMarked || markingToday}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  {markingToday ? 'Marking...' : 'Absent'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calendar + Table Hybrid */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Attendance Calendar</h2>
          
          {/* Calendar Grid */}
          <div className="mb-6">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square"></div>;
                }
                
                const attendance = getAttendanceForDate(date);
                const statusDisplay = getStatusDisplay(attendance?.status);
                const isTodayDate = isToday(date);
                const isFuture = isFutureDate(date);
                const isLocked = false; // TODO: Check if month is closed
                
                return (
                  <div
                    key={date.toISOString()}
                    className={`
                      aspect-square border rounded-lg p-1 flex flex-col items-center justify-center
                      ${isTodayDate ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}
                      ${isFuture ? 'bg-gray-50 opacity-50' : 'bg-white'}
                      ${isLocked ? 'bg-gray-100' : ''}
                    `}
                  >
                    <div className={`text-xs font-medium ${
                      isTodayDate ? 'text-amber-700' : 'text-slate-700'
                    }`}>
                      {date.getDate()}
                    </div>
                    {attendance && (
                      <div className={`text-xs px-1 py-0.5 rounded mt-1 ${statusDisplay.class}`}>
                        {statusDisplay.icon}
                      </div>
                    )}
                    {isLocked && (
                      <div className="text-xs text-gray-400 mt-1">🔒</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Day</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {calendarDays.filter(date => date).map((date) => {
                  const attendance = getAttendanceForDate(date);
                  const statusDisplay = getStatusDisplay(attendance?.status);
                  const isTodayDate = isToday(date);
                  const isFuture = isFutureDate(date);
                  const isPast = isPastDate(date);
                  const isLocked = false; // TODO: Check if month is closed
                  
                  return (
                    <tr key={date.toISOString()} className={isTodayDate ? 'bg-amber-50' : ''}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                        {date.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {attendance ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusDisplay.class}`}>
                            {statusDisplay.text}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {isFuture ? (
                          <span className="text-slate-400">Future date</span>
                        ) : attendance?.status === 'LEAVE' ? (
                          <span className="text-slate-400">Leave day</span>
                        ) : isLocked ? (
                          <span className="text-slate-400">🔒 Locked</span>
                        ) : isTodayDate && !todayMarked ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleMarkAttendance('PRESENT')}
                              disabled={markingToday}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-slate-300"
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleMarkAttendance('ABSENT')}
                              disabled={markingToday}
                              className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-slate-300"
                            >
                              Absent
                            </button>
                          </div>
                        ) : isPast && !attendance ? (
                          <button
                            onClick={() => handleMarkAttendance('PRESENT')}
                            disabled={markingToday}
                            className="px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 disabled:bg-slate-300"
                          >
                            Mark Present
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Context Panel */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Important Information</h3>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-2">
              <span className="mt-0.5">💰</span>
              <div>Attendance does not affect salary directly</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5">🏖️</span>
              <div>Leave days are auto-synced from leave system</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5">🔒</span>
              <div>Locked months cannot be edited</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
