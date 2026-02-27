import React, { useEffect, useState } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';

export function EmployeeAttendance() {
  const { bootstrap } = useBootstrap();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userError, setUserError] = useState(null);

  // Cache-busting timestamp to force browser refresh
  const CACHE_BUST = Date.now();

  const getLocalDateYYYYMMDD = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getLocalDateYYYYMMDD().slice(0, 7));
  const [markingToday, setMarkingToday] = useState(false);
  const [todayMarked, setTodayMarked] = useState(false);
  const [todayAttendanceStatus, setTodayAttendanceStatus] = useState(null); // Store today's status locally

  // Load today's attendance status from localStorage on component mount
  useEffect(() => {
    const storedStatus = localStorage.getItem('todayAttendanceStatus');
    const storedDate = localStorage.getItem('todayAttendanceDate');
    const today = getLocalDateYYYYMMDD();
    
    if (storedStatus && storedDate === today) {
      console.log('Loading today\'s attendance from localStorage:', { storedStatus, storedDate, today });
      setTodayMarked(true);
      setTodayAttendanceStatus(storedStatus);
    }
  }, []);

  const getErrorMessage = (error) => {
    if (!error) return null;
    
    // Handle different error types
    if (error.code === 'FORBIDDEN') {
      return 'You are not allowed to mark attendance.';
    }
    
    if (error.status === 403) {
      return 'You are not allowed to mark attendance.';
    }
    
    if (error.status === 400) {
      return 'Invalid attendance request. Please try again.';
    }
    
    if (error.status === 409) {
      return 'Attendance already marked for today.';
    }
    
    if (error.message?.includes('Self marking is disabled')) {
      return 'Self marking is currently disabled.';
    }
    
    if (error.message?.includes('Past dates are not allowed')) {
      return 'Cannot mark attendance for past dates.';
    }
    
    if (error.message?.includes('Future dates are not allowed')) {
      return 'Cannot mark attendance for future dates.';
    }
    
    // Default message for other errors
    return 'Something went wrong. Please try again later.';
  };

  const clearUserError = () => {
    setUserError(null);
  };

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (userError) {
      const timer = setTimeout(() => {
        setUserError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [userError]);

  useEffect(() => {
    async function fetchAttendanceData() {
      try {
        setLoading(true);
        setUserError(null);
        // Fetch current employee's attendance
        // Try without month parameter first, then with month parameter
        let response;
        try {
          console.log('Trying API without month parameter...');
          response = await apiFetch('/api/v1/attendance/me');
          console.log('API without month response:', JSON.stringify(response, null, 2));
          console.log('Response type:', typeof response);
          console.log('Has items property:', 'items' in response);
          console.log('Items length:', response.items ? response.items.length : 'N/A');
          
          // If still empty, try with month parameter
          if (!response.items || response.items.length === 0) {
            console.log('Empty response, trying with month parameter...');
            const currentMonth = selectedMonth;
            response = await apiFetch(`/api/v1/attendance/me?month=${currentMonth}`);
            console.log('API with month response:', JSON.stringify(response, null, 2));
            console.log('Response type:', typeof response);
            console.log('Has items property:', 'items' in response);
            console.log('Items length:', response.items ? response.items.length : 'N/A');
          }
        } catch (error) {
          console.error('API call failed:', error);
          response = { items: [] };
        }
        
        let attendanceData = [];
        if (Array.isArray(response)) {
          attendanceData = response;
        } else if (response && Array.isArray(response.items)) {
          attendanceData = response.items;
        } else if (response && Array.isArray(response.data)) {
          attendanceData = response.data;
        } else if (response) {
          attendanceData = [response];
        }
        
        console.log('Processed attendance data:', attendanceData);
        setAttendance(attendanceData);
        setError(null);
        
        // Check if today's attendance is marked
        const today = getLocalDateYYYYMMDD();
        const todayRecord = attendanceData.find(
          record => record.attendanceDate === today
        );
        console.log('Today Check Debug:', {
          today: today,
          attendanceDataLength: attendanceData.length,
          attendanceData: JSON.stringify(attendanceData, null, 2),
          todayRecord: JSON.stringify(todayRecord, null, 2),
          todayMarked: !!todayRecord
        });
        setTodayMarked(!!todayRecord);
      } catch (err) {
        console.error('Attendance data fetch error:', err);
        setError(err);
        setUserError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    fetchAttendanceData();
  }, []);

  const handleMarkAttendance = async (status) => {
    try {
      setMarkingToday(true);
      setUserError(null);
      // Fix: Use local date instead of timezone-shifted ISO date
      const localDateStr = getLocalDateYYYYMMDD();
      
      await apiFetch('/api/v1/attendance/me', {
        method: 'POST',
        body: {
          date: localDateStr,
          status: status
        }
      });
      
      // Refresh attendance data
      console.log('Refreshing attendance data after marking...');
      
      // Add a small delay to allow backend to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try multiple approaches to refresh data
      let refreshedData = [];
      try {
        // First try without month parameter
        const response1 = await apiFetch('/api/v1/attendance/me');
        console.log('Refresh response 1 (no month):', JSON.stringify(response1, null, 2));
        refreshedData = response1.items || [];
        
        // If still empty, try with month parameter
        if (refreshedData.length === 0) {
          const currentMonth = selectedMonth;
          const response2 = await apiFetch(`/api/v1/attendance/me?month=${currentMonth}`);
          console.log('Refresh response 2 (with month):', JSON.stringify(response2, null, 2));
          refreshedData = response2.items || [];
        }
      } catch (refreshError) {
        console.error('Refresh failed:', refreshError);
      }
      
      const attendanceData = refreshedData;
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      setError(null);
      
      // Check if today's attendance is now available
      const today = getLocalDateYYYYMMDD();
      const todayRecord = attendanceData.find(record => record.attendanceDate === today);
      console.log('After refresh - Today check:', { today, todayRecord, todayMarked: !!todayRecord });
      
      // Store today's attendance status locally even if API doesn't return it
      if (!todayRecord && status) {
        console.log('API returned empty but marking was successful, storing status locally:', status);
        const today = getLocalDateYYYYMMDD();
        
        // Save to localStorage for persistence across refreshes
        localStorage.setItem('todayAttendanceStatus', status);
        localStorage.setItem('todayAttendanceDate', today);
        
        setTodayMarked(true);
        setTodayAttendanceStatus(status);
      } else {
        setTodayMarked(!!todayRecord);
        if (todayRecord) {
          setTodayAttendanceStatus(todayRecord.status);
          // Also save to localStorage if API returns data
          const today = getLocalDateYYYYMMDD();
          localStorage.setItem('todayAttendanceStatus', todayRecord.status);
          localStorage.setItem('todayAttendanceDate', today);
        }
      }
    } catch (err) {
      console.error('Attendance marking error:', err);
      setError(err);
      setUserError(getErrorMessage(err));
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
    // Fix: Use local date string instead of timezone-shifted ISO date
    const dateStr = date.getFullYear() + '-' + 
      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
      String(date.getDate()).padStart(2, '0');
    
    let result = attendance.find(record => record.attendanceDate === dateStr);
    
    // If no result from API and it's today, use locally stored status
    if (!result && dateStr === getLocalDateYYYYMMDD() && todayMarked && todayAttendanceStatus) {
      result = {
        attendanceDate: dateStr,
        status: todayAttendanceStatus,
        source: 'SELF',
        isLocal: true // Flag to indicate this is locally stored
      };
    }
    
    // Debug logging for today's date
    const today = getLocalDateYYYYMMDD();
    if (dateStr === today) {
      console.log('getAttendanceForDate Debug for today:', {
        dateStr: dateStr,
        today: today,
        result: JSON.stringify(result, null, 2),
        allAttendance: JSON.stringify(attendance, null, 2),
        todayMarked: todayMarked,
        todayAttendanceStatus: todayAttendanceStatus
      });
    }
    
    return result;
  };

  const isToday = (date) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const compareDate = new Date(date);
    compareDate.setHours(0,0,0,0);
    return compareDate.getTime() === today.getTime();
  };

  const isFutureDate = (date) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const compareDate = new Date(date);
    compareDate.setHours(0,0,0,0);
    return compareDate.getTime() > today.getTime();
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const compareDate = new Date(date);
    compareDate.setHours(0,0,0,0);
    return compareDate.getTime() < today.getTime();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
      {/* Error Notification */}
      {userError && (
        <div className="animate-fade-in">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-red-800 font-medium">Error</p>
                <p className="text-sm text-red-700 mt-1">{userError}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={clearUserError}
                  className="inline-flex text-red-400 hover:text-red-600 focus:outline-none focus:text-red-600 transition-colors duration-200"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Month Selector */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Select Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                max={getLocalDateYYYYMMDD().slice(0, 7)}
                className="w-full sm:w-auto px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm font-medium"
              />
            </div>
            <div className="text-center sm:text-right bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
              <div className="text-sm font-semibold text-blue-700 mb-1">Current Month</div>
              <div className="text-xl font-bold text-slate-900">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {todayMarked ? '✓ Attendance Marked' : '○ Pending'}
              </div>
            </div>
          </div>
        </div>

      {/* Today's Actions */}
      {isToday(today) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Today's Attendance</h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {markingToday ? 'Marking...' : 'Present'}
              </button>
              <button
                onClick={() => handleMarkAttendance('ABSENT')}
                disabled={todayMarked || markingToday}
                className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {markingToday ? 'Marking...' : 'Absent'}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Attendance Calendar
          </h2>
          
          <div className="mb-6">
            <div className="grid grid-cols-7 gap-2 mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-slate-600 py-3 bg-slate-50 rounded-lg">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square"></div>;
                }
                
                const attendance = getAttendanceForDate(date);
                const statusDisplay = getStatusDisplay(attendance?.status);
                const isTodayDate = isToday(date);
                const isFuture = isFutureDate(date);
                const isPast = isPastDate(date);
                const isLocked = false; // TODO: Check if month is closed
                
                return (
                  <div
                    key={date.toISOString()}
                    className={`
                      aspect-square border-2 rounded-xl p-2 flex flex-col items-center justify-center transition-all duration-300 transform hover:scale-105
                      ${isTodayDate ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg ring-2 ring-blue-200' : 'border-slate-200'}
                      ${isPast ? 'bg-gray-50 opacity-60 cursor-not-allowed' : ''}
                      ${isFuture ? 'bg-gray-50 opacity-50 cursor-not-allowed' : 'bg-white hover:shadow-md'}
                      ${isLocked ? 'bg-gray-100' : ''}
                    `}
                  >
                    <div className={`text-sm font-bold ${
                      isTodayDate ? 'text-blue-700' : isPast ? 'text-gray-500' : 'text-slate-700'
                    }`}>
                      {date.getDate()}
                    </div>
                    {attendance && (
                      <div className={`text-xs px-1.5 py-0.5 rounded-full mt-1 font-medium ${statusDisplay.class}`}>
                        {statusDisplay.icon}
                      </div>
                    )}
                    {!attendance && isPast && (
                      <div className="text-xs text-gray-400 mt-1 font-medium">Closed</div>
                    )}
                    {!attendance && isFuture && (
                      <div className="text-xs text-gray-400 mt-1">—</div>
                    )}
                    {isTodayDate && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                    {isLocked && (
                      <div className="text-xs text-gray-400 mt-1">🔒</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detailed Attendance Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
            <h2 className="text-xl font-bold text-slate-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Attendance Details
            </h2>
          </div>
          
          {/* Mobile First - Card Layout */}
          <div className="block sm:hidden p-4 space-y-3">
            {calendarDays.filter(date => date).map((date) => {
              const attendance = getAttendanceForDate(date);
              const statusDisplay = getStatusDisplay(attendance?.status);
              const isTodayDate = isToday(date);
              const isFuture = isFutureDate(date);
              const isPast = isPastDate(date);
              const isLocked = false;
              
              return (
                <div key={date.toISOString()} className={`
                  border rounded-xl p-4 transition-all duration-200
                  ${isTodayDate ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50' : 'border-slate-200 bg-white'}
                  ${isPast ? 'opacity-60' : ''}
                  ${isFuture ? 'opacity-50' : ''}
                `}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className={`text-lg font-bold ${isTodayDate ? 'text-blue-700' : 'text-slate-900'}`}>
                        {date.getDate()}
                      </div>
                      <div className="text-sm text-slate-600">
                        {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-right">
                      {attendance ? (
                        <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${statusDisplay.class}`}>
                          {statusDisplay.text}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      {isTodayDate && '⭐ Today'}
                      {isPast && '🔒 Closed'}
                      {isFuture && '⏳ Future'}
                    </div>
                    
                    <div className="flex gap-2">
                      {isFuture ? (
                        <span className="text-slate-400 text-xs px-2 py-1 bg-slate-100 rounded-lg">Not Allowed</span>
                      ) : attendance?.status === 'LEAVE' ? (
                        <span className="text-slate-400 text-xs px-2 py-1 bg-blue-100 rounded-lg">Leave</span>
                      ) : isLocked ? (
                        <span className="text-slate-400 text-xs px-2 py-1 bg-slate-100 rounded-lg">🔒</span>
                      ) : isTodayDate && !todayMarked ? (
                        <>
                          <button
                            onClick={() => handleMarkAttendance('PRESENT')}
                            disabled={markingToday}
                            className="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-slate-300 disabled:to-slate-400 transition-all duration-200 shadow-sm"
                          >
                            {markingToday ? '...' : 'Present'}
                          </button>
                          <button
                            onClick={() => handleMarkAttendance('ABSENT')}
                            disabled={markingToday}
                            className="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 disabled:from-slate-300 disabled:to-slate-400 transition-all duration-200 shadow-sm"
                          >
                            {markingToday ? '...' : 'Absent'}
                          </button>
                        </>
                      ) : isPast ? (
                        <span className="text-slate-400 text-xs px-2 py-1 bg-gray-100 rounded-lg">Closed</span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Desktop - Table Layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Day</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {calendarDays.filter(date => date).map((date) => {
                  const attendance = getAttendanceForDate(date);
                  const statusDisplay = getStatusDisplay(attendance?.status);
                  const isTodayDate = isToday(date);
                  const isFuture = isFutureDate(date);
                  const isPast = isPastDate(date);
                  const isLocked = false;
                  
                  return (
                    <tr key={date.toISOString()} className={`
                      transition-all duration-200 hover:bg-slate-50
                      ${isTodayDate ? 'bg-gradient-to-r from-blue-50 to-indigo-50' : ''}
                      ${isPast ? 'opacity-60' : ''}
                      ${isFuture ? 'opacity-50' : ''}
                    `}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">
                          {date.toLocaleDateString()}
                        </div>
                        {isTodayDate && (
                          <div className="text-xs text-blue-600 font-medium mt-1">⭐ Today</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${isPast ? 'text-gray-500' : 'text-slate-600'}`}>
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attendance ? (
                          <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${statusDisplay.class}`}>
                            {statusDisplay.text}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isFuture ? (
                          <span className="text-slate-400 text-xs px-3 py-1.5 bg-slate-100 rounded-lg font-medium">Not Allowed</span>
                        ) : attendance?.status === 'LEAVE' ? (
                          <span className="text-slate-400 text-xs px-3 py-1.5 bg-blue-100 rounded-lg font-medium">Leave day</span>
                        ) : isLocked ? (
                          <span className="text-slate-400 text-xs px-3 py-1.5 bg-slate-100 rounded-lg font-medium">🔒 Locked</span>
                        ) : isTodayDate && !todayMarked ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleMarkAttendance('PRESENT')}
                              disabled={markingToday}
                              className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-slate-300 disabled:to-slate-400 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              {markingToday ? 'Marking...' : 'Present'}
                            </button>
                            <button
                              onClick={() => handleMarkAttendance('ABSENT')}
                              disabled={markingToday}
                              className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 disabled:from-slate-300 disabled:to-slate-400 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              {markingToday ? 'Marking...' : 'Absent'}
                            </button>
                          </div>
                        ) : isPast ? (
                          <span className="text-slate-400 text-xs px-3 py-1.5 bg-gray-100 rounded-lg font-medium">Closed</span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Context Panel - Mobile Optimized */}
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
  );
}
