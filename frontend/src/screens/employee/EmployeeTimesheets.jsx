import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function EmployeeTimesheets() {
  const { bootstrap } = useBootstrap();
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [viewTimesheetOpen, setViewTimesheetOpen] = useState(false);
  const [viewTimesheetStatus, setViewTimesheetStatus] = useState('idle');
  const [viewTimesheetError, setViewTimesheetError] = useState(null);
  const [viewTimesheet, setViewTimesheet] = useState(null);
  const [userNameCache, setUserNameCache] = useState({});
  
  const [currentWeek, setCurrentWeek] = useState({
    weekStart: null,
    totalHours: 0,
    status: 'DRAFT',
    locked: false,
    entries: []
  });

  const employee = bootstrap?.employee;
  const employeeScope = employee?.scope || 'DIVISION';
  const employeeDivision = employee?.divisionId;
  const systemConfig = bootstrap?.systemConfig || {};
  const maxHoursPerDay = parseInt(systemConfig?.TIMESHEET_MAX_HOURS_PER_DAY?.value) || 8;

  const [autoSaveStatus, setAutoSaveStatus] = useState({});
  const autoSaveTimeouts = useRef({});

  const getCurrentWeekRange = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const initializeWeekEntries = (weekStart) => {
    const weekEntries = [];
    const baseDate = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      weekEntries.push({
        date: dateStr,
        hours: '',
        division: employeeScope === 'COMPANY' ? '' : employeeDivision,
        task: '',
        description: '',
        project: null,
        projectName: '',
        isExpanded: false
      });
    }
    return weekEntries;
  };

  useEffect(() => {
    async function fetchTimesheetsData() {
      try {
        setLoading(true);
        const response = await apiFetch('/api/v1/timesheets/me');
        const timesheetsData = response.items || response || [];
        setTimesheets(Array.isArray(timesheetsData) ? timesheetsData : []);
        
        let currentWeekData = null;
        if (timesheetsData.length > 0) {
          const draftTimesheet = timesheetsData.find(ts => ts.status === 'DRAFT');
          currentWeekData = draftTimesheet || timesheetsData[0];
        }
        
        if (currentWeekData) {
          const detailResponse = await apiFetch(`/api/v1/timesheets/me/${currentWeekData.id}`);
          const data = detailResponse.item || detailResponse;
          const header = data?.header || data;
          const worklogs = data?.worklogs ?? [];
          const weekStart = header?.periodStart;
          const totalHours = header?.totalHours ?? worklogs?.reduce((sum, w) => sum + (w.hours ?? 0), 0) ?? 0;
          
          const mappedEntries = worklogs && worklogs.length > 0 
            ? worklogs.map(worklog => ({
                date: worklog.workDate,
                hours: worklog.hours?.toString() || '0',
                task: worklog.task || '',
                description: worklog.description || '',
                project: worklog.projectId || null,
                projectName: worklog.projectName || ''
              }))
            : initializeWeekEntries(weekStart);
          
          setCurrentWeek({
            weekStart: weekStart,
            totalHours: totalHours,
            status: header?.status || 'DRAFT',
            locked: header?.locked ?? false,
            entries: mappedEntries,
            approvalMetadata: header?.approvalMetadata || null
          });
        } else {
          const weekStart = getCurrentWeekRange();
          setCurrentWeek({
            weekStart,
            totalHours: 0,
            status: 'DRAFT',
            locked: false,
            entries: initializeWeekEntries(weekStart),
            approvalMetadata: null
          });
        }
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTimesheetsData();
  }, []);

  const totalHours = useMemo(() => {
    return currentWeek.entries.reduce((sum, entry) => sum + (parseFloat(entry.hours) || 0), 0);
  }, [currentWeek.entries]);

  const autoSaveEntry = useCallback(debounce(async (entry) => {
    if (!entry.hours || parseFloat(entry.hours) === 0 || !entry.task || !entry.task.trim() || !entry.projectName || !entry.description) return;
    try {
      setAutoSaveStatus(prev => ({ ...prev, [entry.date]: 'saving' }));
      await apiFetch('/api/v1/timesheets/me', {
        method: 'POST',
        body: {
          workDate: entry.date,
          task: entry.task,
          hours: Number(entry.hours),
          description: entry.description || null,
          projectId: entry.project || null,
          projectName: entry.projectName || null
        }
      });
      setAutoSaveStatus(prev => ({ ...prev, [entry.date]: 'saved' }));
      setTimeout(() => setAutoSaveStatus(prev => ({ ...prev, [entry.date]: null })), 2000);
    } catch (err) {
      setAutoSaveStatus(prev => ({ ...prev, [entry.date]: 'error' }));
      setTimeout(() => setAutoSaveStatus(prev => ({ ...prev, [entry.date]: null })), 3000);
    }
  }, 800), []);

  const handleEntryChange = (index, field, value) => {
    const updatedWeek = { ...currentWeek };
    updatedWeek.entries = [...updatedWeek.entries];
    updatedWeek.entries[index] = { ...updatedWeek.entries[index], [field]: value };
    setCurrentWeek(updatedWeek);

    if (field === 'hours' || field === 'task' || field === 'description' || field === 'project' || field === 'projectName') {
      const entry = updatedWeek.entries[index];
      if (autoSaveTimeouts.current[entry.date]) clearTimeout(autoSaveTimeouts.current[entry.date]);
      autoSaveTimeouts.current[entry.date] = setTimeout(() => autoSaveEntry(entry), 800);
    }
  };

  const loadWeek = async (startDate) => {
    if (!startDate) return;
    try {
      const res = await apiFetch("/api/v1/timesheets/me");
      const sheet = res.items?.find(ts => ts.periodStart === startDate);
      const baseWeek = initializeWeekEntries(startDate);
      if (!sheet) {
        setCurrentWeek({ weekStart: startDate, status: "DRAFT", locked: false, entries: baseWeek, totalHours: 0, approvalMetadata: null });
        return;
      }
      const detailResponse = await apiFetch(`/api/v1/timesheets/me/${sheet.id}`);
      const data = detailResponse.item || detailResponse;
      const header = data?.header || data;
      const worklogs = data?.worklogs ?? [];
      const totalHours = header?.totalHours ?? worklogs?.reduce((sum, w) => sum + (w.hours ?? 0), 0) ?? 0;
      const mergedEntries = baseWeek.map(day => {
        const log = worklogs.find(w => w.workDate === day.date);
        return log ? { ...day, hours: log.hours?.toString() || '0', task: log.task || '', description: log.description || '', project: log.projectId || null, projectName: log.projectName || '' } : { ...day, hours: '0', task: '', description: '', project: null, projectName: '' };
      });
      setCurrentWeek({ weekStart: header?.periodStart ?? startDate, status: header?.status ?? "DRAFT", locked: header?.locked ?? false, entries: mergedEntries, totalHours: totalHours, approvalMetadata: header?.approvalMetadata || null });
    } catch (err) {}
  };

  const handleSubmitWeek = async () => {
    try {
      setSubmitting(true);
      const validEntries = currentWeek.entries.filter(entry => parseFloat(entry.hours) > 0 && entry.task && entry.task.trim() !== '' && entry.projectName && entry.description);
      if (validEntries.length === 0) {
        setError({ title: 'Validation Error', message: 'Please fill all required fields before submitting.' });
        return;
      }
      let timesheetId = null;
      for (const entry of validEntries) {
        const response = await apiFetch('/api/v1/timesheets/me', {
          method: 'POST',
          body: { workDate: entry.date, task: entry.task, hours: Number(entry.hours), description: entry.description || null, projectId: entry.project || null, projectName: entry.projectName || null }
        });
        if (!timesheetId && response?.header?.id) timesheetId = response.header.id;
      }
      if (!timesheetId) throw new Error('No timesheet ID found');
      const submitResponse = await apiFetch(`/api/v1/timesheets/${timesheetId}/submit`, { method: 'POST', body: {} });
      const header = submitResponse.item || submitResponse;
      const worklogs = submitResponse?.worklogs ?? [];
      const totalHours = header?.totalHours ?? worklogs?.reduce((sum, w) => sum + (w.hours ?? 0), 0) ?? 0;
      setCurrentWeek(prev => ({ ...prev, status: header?.status || 'SUBMITTED', totalHours }));
      const listResponse = await apiFetch('/api/v1/timesheets/me');
      setTimesheets(listResponse.items || listResponse || []);
    } catch (err) {
      setError({ title: 'Submission Error', message: err.message || 'Something went wrong.' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = { DRAFT: 'bg-blue-50 text-blue-700 border-blue-200', SUBMITTED: 'bg-amber-50 text-amber-700 border-amber-200', APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200', REJECTED: 'bg-rose-50 text-rose-700 border-rose-200' };
    return styles[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fmtDateTime = (v) => {
    if (!v) return '—';
    try {
      const d = new Date(v);
      if (!Number.isFinite(d.getTime())) return String(v);
      return d.toLocaleString();
    } catch { return String(v); }
  };

  const openTimesheetView = async (ts) => {
    try {
      setViewTimesheetOpen(true);
      setViewTimesheetStatus('loading');
      setViewTimesheetError(null);
      setViewTimesheet(null);
      if (!ts?.id) throw new Error('Timesheet id missing');
      const detail = await apiFetch(`/api/v1/timesheets/me/${ts.id}`);
      const payload = detail?.item || detail;
      const header = payload?.header || payload;
      setViewTimesheet({
        id: header?.id,
        periodStart: header?.periodStart,
        periodEnd: header?.periodEnd,
        status: header?.status,
        submittedAt: header?.submittedAt,
        submittedBy: header?.submittedBy,
        approvedL1At: header?.approvedL1At,
        approvedL1By: header?.approvedL1By,
        approvedL2At: header?.approvedL2At,
        approvedL2By: header?.approvedL2By,
        rejectedAt: header?.rejectedAt,
        rejectedBy: header?.rejectedBy,
        rejectedReason: header?.rejectedReason
      });
      setViewTimesheetStatus('ready');
    } catch (e) {
      setViewTimesheetError(e);
      setViewTimesheetStatus('error');
    }
  };

  const closeTimesheetView = () => {
    setViewTimesheetOpen(false);
    setViewTimesheetStatus('idle');
    setViewTimesheetError(null);
    setViewTimesheet(null);
  };

  const displayNameOrId = (id) => {
    if (!id) return '—';
    const v = userNameCache[String(id)];
    return v || String(id);
  };

  if (loading) return <div className="p-8"><LoadingState /></div>;
  if (error && error.title !== 'Success') return <div className="p-8"><ErrorState error={error} onRetry={() => window.location.reload()} /></div>;

  const isEditable = currentWeek?.status === "DRAFT" || currentWeek?.status === "REJECTED";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 md:space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold">Timesheet Entry</h1>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 w-fit">
              <input 
                type="date" 
                value={currentWeek.weekStart || ''} 
                onChange={(e) => loadWeek(e.target.value)} 
                className="bg-transparent border-none text-white font-bold focus:ring-0 cursor-pointer text-sm"
              />
              <div className="w-1 h-4 bg-white/30 rounded-full"></div>
              <span className="text-blue-100 font-medium text-xs md:text-sm">Commencing</span>
            </div>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8 border-t border-white/10 pt-6 md:pt-0 md:border-none">
            <div className="text-left md:text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">Total Hours</div>
              <div className="text-3xl md:text-4xl font-black">{totalHours}</div>
            </div>
            <div className="h-12 w-px bg-white/20 hidden md:block"></div>
            <div className="space-y-2">
              <span className={cx('px-4 py-1.5 rounded-full text-[10px] font-bold border block text-center', getStatusBadge(currentWeek.status))}>
                {currentWeek.status}
              </span>
              {isEditable && (
                <button
                  onClick={handleSubmitWeek}
                  disabled={submitting || totalHours === 0}
                  className="px-6 py-2 bg-white text-blue-700 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg disabled:opacity-50 text-sm"
                >
                  {submitting ? '...' : 'Submit'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-32">Day / Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-48">Project</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Task & Work Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-24">Hours</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-24 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentWeek.entries.map((entry, idx) => {
                    const isFuture = new Date(entry.date) > new Date();
                    const saveStatus = autoSaveStatus[entry.date];
                    return (
                      <tr key={idx} className={cx('group transition-colors', isFuture ? 'bg-slate-50/30 opacity-60' : 'hover:bg-slate-50/50')}>
                        <td className="px-6 py-4 align-top">
                          <div className="font-bold text-slate-900 whitespace-nowrap">{weekDays[idx]}</div>
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-tight">{new Date(entry.date).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <input
                            type="text"
                            value={entry.projectName}
                            onChange={(e) => handleEntryChange(idx, 'projectName', e.target.value)}
                            disabled={!isEditable || isFuture}
                            className="w-full px-4 py-2 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-sm disabled:bg-transparent placeholder:text-slate-300"
                            placeholder={isFuture ? 'Locked' : 'Project Name'}
                          />
                        </td>
                        <td className="px-6 py-4 align-top space-y-2">
                          <input
                            type="text"
                            value={entry.task}
                            onChange={(e) => handleEntryChange(idx, 'task', e.target.value)}
                            disabled={!isEditable || isFuture}
                            className="w-full px-4 py-2 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-sm disabled:bg-transparent placeholder:text-slate-300"
                            placeholder={isFuture ? 'Locked' : 'Main Task'}
                          />
                          <textarea
                            value={entry.description}
                            onChange={(e) => handleEntryChange(idx, 'description', e.target.value)}
                            disabled={!isEditable || isFuture}
                            rows="1"
                            className="w-full px-4 py-2 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all text-xs font-medium disabled:bg-transparent placeholder:text-slate-300 resize-none overflow-hidden min-h-[40px]"
                            placeholder={isFuture ? '' : 'Work details & notes...'}
                          />
                        </td>
                        <td className="px-6 py-4 align-top">
                          <input
                            type="number"
                            value={entry.hours}
                            onChange={(e) => handleEntryChange(idx, 'hours', e.target.value)}
                            disabled={!isEditable || isFuture}
                            className="w-16 px-3 py-2 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-center disabled:bg-transparent placeholder:text-slate-300"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          {saveStatus === 'saving' && <span className="text-[10px] font-bold text-blue-500 animate-pulse">SAVING...</span>}
                          {saveStatus === 'saved' && <span className="text-[10px] font-bold text-emerald-500">SAVED ✓</span>}
                          {saveStatus === 'error' && <span className="text-[10px] font-bold text-rose-500">ERROR ✕</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {currentWeek.entries.map((entry, idx) => {
              const isFuture = new Date(entry.date) > new Date();
              const saveStatus = autoSaveStatus[entry.date];
              return (
                <div key={idx} className={cx('bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4', isFuture ? 'opacity-60 bg-slate-50/30' : '')}>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <div>
                      <div className="font-bold text-slate-900">{weekDays[idx]}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{new Date(entry.date).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Hours</div>
                        <input
                          type="number"
                          value={entry.hours}
                          onChange={(e) => handleEntryChange(idx, 'hours', e.target.value)}
                          disabled={!isEditable || isFuture}
                          className="w-14 px-2 py-1 rounded-lg border border-slate-200 focus:border-blue-500 outline-none font-bold text-center bg-slate-50 disabled:bg-transparent"
                        />
                      </div>
                      <div className="min-w-[40px] text-right">
                        {saveStatus === 'saving' && <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping ml-auto"></div>}
                        {saveStatus === 'saved' && <span className="text-[10px] font-bold text-emerald-500">✓</span>}
                        {saveStatus === 'error' && <span className="text-[10px] font-bold text-rose-500">✕</span>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Project Name</label>
                      <input
                        type="text"
                        value={entry.projectName}
                        onChange={(e) => handleEntryChange(idx, 'projectName', e.target.value)}
                        disabled={!isEditable || isFuture}
                        className="w-full px-3 py-2 rounded-xl border border-slate-100 bg-slate-50/50 focus:border-blue-500 outline-none transition-all font-bold text-sm disabled:bg-transparent"
                        placeholder="e.g. Internal Audit"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Task Title</label>
                      <input
                        type="text"
                        value={entry.task}
                        onChange={(e) => handleEntryChange(idx, 'task', e.target.value)}
                        disabled={!isEditable || isFuture}
                        className="w-full px-3 py-2 rounded-xl border border-slate-100 bg-slate-50/50 focus:border-blue-500 outline-none transition-all font-bold text-sm disabled:bg-transparent"
                        placeholder="What did you do?"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Work Description</label>
                      <textarea
                        value={entry.description}
                        onChange={(e) => handleEntryChange(idx, 'description', e.target.value)}
                        disabled={!isEditable || isFuture}
                        rows="2"
                        className="w-full px-3 py-2 rounded-xl border border-slate-100 bg-slate-50/50 focus:border-blue-500 outline-none transition-all text-xs font-medium disabled:bg-transparent resize-none"
                        placeholder="Detailed notes..."
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Weeks</h3>
            <div className="space-y-3">
              {timesheets.slice(0, 5).map((ts) => (
                <div key={ts.id} className="p-4 rounded-2xl border border-slate-100 hover:border-blue-100 transition-all group cursor-pointer" onClick={() => loadWeek(ts.periodStart)}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-sm font-bold text-slate-900">{new Date(ts.periodStart).toLocaleDateString()}</div>
                    <span className={cx('text-[10px] px-2 py-0.5 rounded-full font-bold border', getStatusBadge(ts.status))}>{ts.status}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">{ts.totalHours || 0} Hours logged</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100">
            <div className="flex items-center gap-3 text-blue-700 mb-3">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <span className="font-bold">Guidelines</span>
            </div>
            <ul className="space-y-4 text-sm text-slate-600 font-medium">
              <li>• Descriptions are mandatory for all entries.</li>
              <li>• Maximum {maxHoursPerDay} hours per day allowed.</li>
              <li>• Timesheet tagging and project allocation is required.</li>
              <li>• Weekly submission is mandatory.</li>
              <li>• Contact your reporting manager for manual corrections.</li>
            </ul>
          </div>
        </div>
      </div>

      {viewTimesheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Timesheet Summary</h3>
                <div className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-wider">Reference: {viewTimesheet?.id || '...'}</div>
              </div>
              <button onClick={closeTimesheetView} className="hover:bg-slate-200 p-2 rounded-xl text-slate-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {viewTimesheetStatus === 'loading' ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className="mt-4 text-sm font-bold text-slate-400 uppercase tracking-widest">Retrieving Details...</span>
                </div>
              ) : viewTimesheetStatus === 'error' ? (
                <div className="py-20 text-center text-rose-600 font-bold">Failed to load timesheet details.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Period Coverage</div>
                      <div className="text-sm font-bold mt-1 text-slate-900">
                        {new Date(viewTimesheet.periodStart).toLocaleDateString()} - {new Date(viewTimesheet.periodEnd).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Status</div>
                      <div className="mt-1">
                        <span className={cx('inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border', getStatusBadge(viewTimesheet.status))}>
                          {viewTimesheet.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Approval Workflow</div>
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 flex justify-between items-center">
                        <div>
                          <div className="text-[10px] font-bold text-blue-400 uppercase">Submitted By</div>
                          <div className="text-sm font-bold text-slate-900">{displayNameOrId(viewTimesheet.submittedBy)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-blue-400 uppercase">Timestamp</div>
                          <div className="text-xs font-medium text-slate-600">{fmtDateTime(viewTimesheet.submittedAt)}</div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">L1 Manager Approval</div>
                          <div className="text-sm font-bold text-slate-900">{displayNameOrId(viewTimesheet.approvedL1By)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Timestamp</div>
                          <div className="text-xs font-medium text-slate-600">{fmtDateTime(viewTimesheet.approvedL1At)}</div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">L2 Manager Approval</div>
                          <div className="text-sm font-bold text-slate-900">{displayNameOrId(viewTimesheet.approvedL2By)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Timestamp</div>
                          <div className="text-xs font-medium text-slate-600">{fmtDateTime(viewTimesheet.approvedL2At)}</div>
                        </div>
                      </div>

                      {viewTimesheet.rejectedAt && (
                        <div className="p-4 rounded-xl border border-rose-100 bg-rose-50 flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-[10px] font-bold text-rose-400 uppercase">Rejected By</div>
                              <div className="text-sm font-bold text-rose-900">{displayNameOrId(viewTimesheet.rejectedBy)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-rose-400 uppercase">Timestamp</div>
                              <div className="text-xs font-medium text-rose-700">{fmtDateTime(viewTimesheet.rejectedAt)}</div>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-rose-200">
                             <div className="text-[10px] font-bold text-rose-400 uppercase mb-1">Reason for Rejection</div>
                             <p className="text-sm text-rose-900 font-medium italic">"{viewTimesheet.rejectedReason || 'No reason specified.'}"</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={closeTimesheetView}
                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                  >
                    Close Review
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
