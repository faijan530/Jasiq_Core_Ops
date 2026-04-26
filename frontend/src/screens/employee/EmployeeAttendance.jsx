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
  const [todayAttendanceStatus, setTodayAttendanceStatus] = useState(null);

  useEffect(() => {
    const storedStatus = localStorage.getItem('todayAttendanceStatus');
    const storedDate = localStorage.getItem('todayAttendanceDate');
    const today = getLocalDateYYYYMMDD();
    
    if (storedStatus && storedDate === today) {
      setTodayMarked(true);
      setTodayAttendanceStatus(storedStatus);
    }
  }, []);

  const getErrorMessage = (error) => {
    if (!error) return null;
    if (error.code === 'FORBIDDEN' || error.status === 403) return 'You are not allowed to mark attendance.';
    if (error.status === 400) return 'Invalid attendance request. Please try again.';
    if (error.status === 409) return 'Attendance already marked for today.';
    if (error.message?.includes('Self marking is disabled')) return 'Self marking is currently disabled.';
    if (error.message?.includes('Past dates are not allowed')) return 'Cannot mark attendance for past dates.';
    if (error.message?.includes('Future dates are not allowed')) return 'Cannot mark attendance for future dates.';
    return 'Something went wrong. Please try again later.';
  };

  useEffect(() => {
    if (userError) {
      const timer = setTimeout(() => setUserError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [userError]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setUserError(null);
      let response;
      try {
        response = await apiFetch('/api/v1/attendance/me');
        if (!response.items || response.items.length === 0) {
          response = await apiFetch(`/api/v1/attendance/me?month=${selectedMonth}`);
        }
      } catch (error) {
        response = { items: [] };
      }
      
      let attendanceData = Array.isArray(response) ? response : (response.items || response.data || [response]);
      if (!Array.isArray(attendanceData)) attendanceData = [];
      
      setAttendance(attendanceData);
      setError(null);
      
      const today = getLocalDateYYYYMMDD();
      const todayRecord = attendanceData.find(record => record.attendanceDate === today);
      setTodayMarked(!!todayRecord);
      if (todayRecord) setTodayAttendanceStatus(todayRecord.status);
    } catch (err) {
      setError(err);
      setUserError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedMonth]);

  const handleMarkAttendance = async (status) => {
    try {
      setMarkingToday(true);
      setUserError(null);
      const localDateStr = getLocalDateYYYYMMDD();
      
      await apiFetch('/api/v1/attendance/me', {
        method: 'POST',
        body: { date: localDateStr, status: status }
      });
      
      await new Promise(resolve => setTimeout(resolve, 800));
      await fetchAttendanceData();
      
      const today = getLocalDateYYYYMMDD();
      localStorage.setItem('todayAttendanceStatus', status);
      localStorage.setItem('todayAttendanceDate', today);
      setTodayMarked(true);
      setTodayAttendanceStatus(status);
    } catch (err) {
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
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  };

  const getAttendanceForDate = (date) => {
    const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    let result = attendance.find(record => record.attendanceDate === dateStr);
    if (!result && dateStr === getLocalDateYYYYMMDD() && todayMarked && todayAttendanceStatus) {
      result = { attendanceDate: dateStr, status: todayAttendanceStatus };
    }
    return result;
  };

  const isToday = (date) => {
    const d = new Date();
    return date.getDate() === d.getDate() && date.getMonth() === d.getMonth() && date.getFullYear() === d.getFullYear();
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'PRESENT': return { text: 'Present', icon: '✓', class: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
      case 'ABSENT': return { text: 'Absent', icon: '✕', class: 'text-rose-600 bg-rose-50 border-rose-100' };
      case 'LEAVE': return { text: 'Leave', icon: 'L', class: 'text-amber-600 bg-amber-50 border-amber-100' };
      default: return { text: '—', icon: '—', class: 'text-slate-400 bg-slate-50 border-slate-100' };
    }
  };

  if (loading) return <div className="p-8"><LoadingState /></div>;
  if (error) return <div className="p-8"><ErrorState error={error} onRetry={fetchAttendanceData} /></div>;

  const currentDate = new Date(selectedMonth + '-01');
  const calendarDays = getDaysInMonth(currentDate);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Attendance Records</h1>
            <p className="text-blue-100 mt-2 opacity-90">Track your daily presence and manage your work schedule.</p>
          </div>
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-wider opacity-70">Current View</div>
              <div className="text-lg font-bold">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Daily Check-in</h3>
            {!todayMarked ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Mark your attendance for today, {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleMarkAttendance('PRESENT')}
                    disabled={markingToday}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all group disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="font-bold">Present</span>
                  </button>
                  <button
                    onClick={() => handleMarkAttendance('ABSENT')}
                    disabled={markingToday}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 transition-all group disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                    <span className="font-bold">Absent</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h4 className="text-emerald-900 font-bold text-lg">Already Marked</h4>
                <p className="text-emerald-700 text-sm mt-1">Status: <span className="font-bold">{todayAttendanceStatus}</span></p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">View Records</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Select Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none font-medium"
                />
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 text-blue-600 mt-0.5">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed font-medium">Locked months cannot be modified. Past attendance is automatically synced with payroll.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Attendance Calendar</h3>
              <div className="flex gap-2">
                {['Present', 'Absent', 'Leave'].map(l => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${l === 'Present' ? 'bg-emerald-500' : l === 'Absent' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                    <span className="text-xs font-semibold text-slate-500">{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-7 gap-3">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">{d}</div>
                ))}
                {calendarDays.map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} className="aspect-square"></div>;
                  const record = getAttendanceForDate(date);
                  const status = getStatusDisplay(record?.status);
                  const isDayToday = isToday(date);
                  
                  return (
                    <div 
                      key={date.toISOString()}
                      className={`
                        aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all relative
                        ${isDayToday ? 'border-blue-500 bg-blue-50 shadow-md scale-105 z-10' : 'border-slate-50 hover:border-slate-200 hover:bg-slate-50'}
                      `}
                    >
                      <span className={`text-sm font-bold ${isDayToday ? 'text-blue-700' : 'text-slate-900'}`}>{date.getDate()}</span>
                      {record && (
                        <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${status.class}`}>
                          {status.text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">Daily Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Day</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {calendarDays.filter(d => d && d <= new Date()).reverse().map((date) => {
                const record = getAttendanceForDate(date);
                const status = getStatusDisplay(record?.status);
                return (
                  <tr key={date.toISOString()} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{date.toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{date.toLocaleDateString('en-US', { weekday: 'long' })}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${status.class}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {record?.source || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {userError && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-rose-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <span className="font-bold">{userError}</span>
            <button onClick={() => setUserError(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
