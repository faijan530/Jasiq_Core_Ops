import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

// Debounce utility function
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
  
  // Current week state
  const [currentWeek, setCurrentWeek] = useState({
    weekStart: null,  // Use null instead of empty string
    totalHours: 0,
    status: 'DRAFT',
    locked: false,
    entries: []
  });

  // Employee scope and division info
  const employee = bootstrap?.employee;
  const employeeScope = employee?.scope || 'DIVISION';
  const employeeDivision = employee?.divisionId;
  const systemConfig = bootstrap?.systemConfig || {};
  const maxHoursPerDay = parseInt(systemConfig?.TIMESHEET_MAX_HOURS_PER_DAY?.value) || 8;

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState({});
  const autoSaveTimeouts = useRef({});

  // Get current week range
  const getCurrentWeekRange = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  // Initialize current week entries
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
        description: '',
        project: null,
        isExpanded: false
      });
    }
    
    return weekEntries;
  };

  // Fetch timesheets data
  useEffect(() => {
    async function fetchTimesheetsData() {
      try {
        setLoading(true);
        
        // Fetch current employee's timesheets (headers only)
        const response = await apiFetch('/api/v1/timesheets/me');
        const timesheetsData = response.items || response || [];
        setTimesheets(Array.isArray(timesheetsData) ? timesheetsData : []);
        
        // Auto-load logic: Try to find existing draft first
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
          // Fetch full timesheet details including worklogs
          const detailResponse = await apiFetch(`/api/v1/timesheets/me/${currentWeekData.id}`);
          const data = detailResponse.item || detailResponse;
          
          // Proper mapping from backend response structure
          const header = data?.header || data;
          const worklogs = data?.worklogs ?? [];
          
          const weekStart = header?.periodStart;
          
          // Use totalHours from backend if available, otherwise calculate
          const totalHours = header?.totalHours ?? worklogs?.reduce(
            (sum, w) => sum + (w.hours ?? 0),
            0
          ) ?? 0;
          
          // Map worklogs to entries format
          const mappedEntries = worklogs && worklogs.length > 0 
            ? worklogs.map(worklog => ({
                date: worklog.workDate,
                hours: worklog.hours?.toString() || '0',
                description: worklog.task || worklog.description || '',
                project: worklog.projectId || null
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
          // Fallback: Initialize normally using getCurrentWeekRange()
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

  // Calculate total hours
  const totalHours = useMemo(() => {
    return currentWeek.entries.reduce((sum, entry) => sum + (parseFloat(entry.hours) || 0), 0);
  }, [currentWeek.entries]);

  // Validation checks
  const validationChecks = useMemo(() => {
    const checks = {
      totalHoursValid: totalHours > 0,
      descriptionsCompleted: currentWeek.entries.every(entry => 
        !entry.hours || parseFloat(entry.hours) === 0 || (entry.description && entry.description.trim().length > 0)
      ),
      noFutureEntries: currentWeek.entries.every(entry => {
        if (!entry.hours || parseFloat(entry.hours) === 0) return true;
        const entryDate = new Date(entry.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return entryDate <= today;
      }),
      divisionValid: employeeScope === 'DIVISION' || currentWeek.entries.every(entry => 
        !entry.hours || parseFloat(entry.hours) === 0 || entry.division
      )
    };
    
    return {
      ...checks,
      allValid: Object.values(checks).every(Boolean)
    };
  }, [currentWeek.entries, totalHours, employeeScope]);

  // Fetch worklogs for a specific timesheet and calculate total hours
  const fetchTimesheetTotalHours = async (timesheetId) => {
    try {
      const response = await apiFetch(`/api/v1/timesheets/me/${timesheetId}`);
      const data = response.item || response;
      const worklogs = data?.worklogs ?? [];
      return worklogs.reduce((sum, w) => sum + (w.hours || 0), 0);
    } catch (err) {
      console.error('Error fetching worklogs for total hours:', err);
      return 0;
    }
  };

  // State for storing total hours for previous timesheets
  const [previousTimesheetsHours, setPreviousTimesheetsHours] = useState({});

  // Fetch total hours for previous timesheets when timesheets change
  useEffect(() => {
    const fetchTotalHoursForPreviousTimesheets = async () => {
      const previousWeeks = timesheets.filter(week => week.status !== 'DRAFT');
      const hoursMap = {};
      
      for (const timesheet of previousWeeks) {
        if (timesheet.id && !timesheet.totalHours) {
          hoursMap[timesheet.id] = await fetchTimesheetTotalHours(timesheet.id);
        } else {
          hoursMap[timesheet.id] = timesheet.totalHours || 0;
        }
      }
      
      setPreviousTimesheetsHours(hoursMap);
    };
    
    if (timesheets.length > 0) {
      fetchTotalHoursForPreviousTimesheets();
    }
  }, [timesheets]);

  // Ensure week is loaded on refresh - only if we have a valid weekStart
  useEffect(() => {
    // Remove this useEffect as it's causing the weekStart to be reset
    // The initial data loading in the main useEffect handles this properly
  }, []);

  // Auto-save function with debounce
  const autoSaveEntry = useCallback(debounce(async (entry) => {
    // Only auto-save if hours > 0 and description not empty
    if (!entry.hours || parseFloat(entry.hours) === 0 || !entry.description || !entry.description.trim()) {
      return;
    }

    try {
      setAutoSaveStatus(prev => ({ ...prev, [entry.date]: 'saving' }));

      await apiFetch('/api/v1/timesheets/me', {
        method: 'POST',
        body: {
          workDate: entry.date,
          task: entry.description,
          hours: Number(entry.hours),
          description: entry.description || null,
          projectId: entry.project || null
        }
      });

      setAutoSaveStatus(prev => ({ ...prev, [entry.date]: 'saved' }));
      
      // Clear saved status after 2 seconds
      setTimeout(() => {
        setAutoSaveStatus(prev => ({ ...prev, [entry.date]: null }));
      }, 2000);

    } catch (err) {
      console.error('Auto-save failed:', err);
      setAutoSaveStatus(prev => ({ ...prev, [entry.date]: 'error' }));
      
      // Clear error status after 3 seconds
      setTimeout(() => {
        setAutoSaveStatus(prev => ({ ...prev, [entry.date]: null }));
      }, 3000);
    }
  }, 800), []);

  // Handle field changes with auto-save
  const handleEntryChange = (index, field, value) => {
    const updatedWeek = { ...currentWeek };
    updatedWeek.entries = [...updatedWeek.entries];
    updatedWeek.entries[index] = {
      ...updatedWeek.entries[index],
      [field]: value
    };
    setCurrentWeek(updatedWeek);

    // Trigger auto-save for hours, description, or project changes
    if (field === 'hours' || field === 'description' || field === 'project') {
      const entry = updatedWeek.entries[index];
      
      // Clear existing timeout for this entry
      if (autoSaveTimeouts.current[entry.date]) {
        clearTimeout(autoSaveTimeouts.current[entry.date]);
      }
      
      // Set new timeout for auto-save
      autoSaveTimeouts.current[entry.date] = setTimeout(() => {
        autoSaveEntry(entry);
      }, 800);
    }
  };

  // Load week data with worklogs
  const loadWeek = async (startDate) => {
    try {
      // Validate startDate
      if (!startDate || startDate === '' || startDate === undefined) {
        console.warn('Invalid startDate provided to loadWeek:', startDate);
        return;
      }
      
      console.log('Loading week for startDate:', startDate);
      
      const res = await apiFetch("/api/v1/timesheets/me");
      const sheet = res.items?.find(ts => ts.periodStart === startDate);

      const baseWeek = initializeWeekEntries(startDate);

      if (!sheet) {
        console.log('No existing sheet found, creating new week for:', startDate);
        setCurrentWeek({
          weekStart: startDate,
          status: "DRAFT",
          locked: false,
          entries: baseWeek,
          totalHours: 0,
          approvalMetadata: null
        });
        return;
      }

      // Fetch full timesheet details including worklogs
      const detailResponse = await apiFetch(`/api/v1/timesheets/me/${sheet.id}`);
      const data = detailResponse.item || detailResponse;

      console.log('Full sheet data:', data);

      // Proper mapping from backend response structure
      const header = data?.header || data;
      const worklogs = data?.worklogs ?? [];

      // Use totalHours from backend if available, otherwise calculate
      const totalHours = header?.totalHours ?? worklogs?.reduce(
        (sum, w) => sum + (w.hours ?? 0),
        0
      ) ?? 0;

      // Generate week entries by merging base week with worklogs
      const mergedEntries = baseWeek.map(day => {
        const log = worklogs.find(w => w.workDate === day.date);
        if (log) {
          return {
            ...day,
            hours: log.hours?.toString() || '0',
            description: log.task || log.description || '',
            project: log.projectId || null
          };
        }
        return {
          ...day,
          hours: '0',
          description: '',
          project: null
        };
      });

      const newWeekState = {
        weekStart: header?.periodStart ?? startDate,
        status: header?.status ?? "DRAFT",
        locked: header?.locked ?? false,
        entries: mergedEntries,
        totalHours: totalHours,
        approvalMetadata: header?.approvalMetadata || null
      };

      console.log('Setting week state from loadWeek:', newWeekState);
      setCurrentWeek(newWeekState);

    } catch (err) {
      console.error('Error loading week:', err);
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (index) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Handle timesheet errors with friendly messages
  const handleTimesheetError = (error) => {
    // Safely extract error information
    const errorCode = error?.response?.data?.error?.code;
    const errorMessage = error?.response?.data?.error?.message || '';
    const status = error?.response?.status;
    
    // Internal server error
    if (errorCode === "INTERNAL") {
      setError({
        title: 'Server Error',
        message: "We're having trouble saving your timesheet right now. Please try again in a moment."
      });
      return;
    }
    
    // Duplicate key constraint violation
    if (errorMessage.includes("duplicate key value")) {
      setError({
        title: 'Duplicate Timesheet',
        message: 'A timesheet for this period already exists. Please refresh the page.'
      });
      return;
    }
    
    // Hours limit exceeded
    if (errorMessage.includes("Total hours exceed")) {
      setError({
        title: 'Hours Limit Exceeded',
        message: 'You have exceeded the maximum allowed 8 hours for a day. Please adjust your entries.'
      });
      return;
    }
    
    // Validation error (400 status)
    if (status === 400) {
      setError({
        title: 'Validation Error',
        message: 'Please fill all required fields before submitting.'
      });
      return;
    }
    
    // Generic fallback for any other error
    setError({
      title: 'Submission Error',
      message: 'Something went wrong. Please try again.'
    });
  };

  // Submit week
  const handleSubmitWeek = async () => {
    try {
      setSubmitting(true);
      
      // Get valid entries
      const validEntries = currentWeek.entries.filter(entry => 
        parseFloat(entry.hours) > 0 && entry.description && entry.description.trim() !== ''
      );
      
      if (validEntries.length === 0) {
        setError({
          title: 'Validation Error',
          message: 'Please fill all required fields before submitting.'
        });
        return;
      }
      
      console.log(`Submitting ${validEntries.length} entries sequentially...`);
      
      let timesheetId = null;
      
      // Step 1: Save all worklogs (draft stage)
      for (const entry of validEntries) {
        const payload = {
          workDate: entry.date,
          task: entry.description,
          hours: Number(entry.hours),
          description: entry.description || null,
          projectId: entry.project || null
        };
        
        console.log('Submitting entry:', payload);
        
        try {
          const response = await apiFetch('/api/v1/timesheets/me', {
            method: 'POST',
            body: payload
          });
          console.log('Entry submitted successfully:', entry.date);
          
          // Extract timesheet ID from the first successful response
          if (!timesheetId && response?.header?.id) {
            timesheetId = response.header.id;
            console.log('Found timesheet ID:', timesheetId);
          }
        } catch (entryError) {
          console.error('Failed to submit entry:', entry.date, entryError);
          throw entryError; // Stop loop on first error
        }
      }
      
      if (!timesheetId) {
        throw new Error('No timesheet ID found after saving worklogs');
      }
      
      console.log('All entries submitted successfully, submitting timesheet...');
      
      // Step 2: Explicitly mark timesheet header as SUBMITTED
      const submitResponse = await apiFetch(`/api/v1/timesheets/${timesheetId}/submit`, {
        method: 'POST',
        body: {}
      });
      
      console.log('Submit response:', submitResponse);
      
      // Step 3: Replace local state with response data
      const submittedTimesheet = submitResponse.item || submitResponse;
      console.log('Submitted timesheet data:', submittedTimesheet);
      
      if (submittedTimesheet) {
        // Proper mapping from backend response structure
        const header = submittedTimesheet?.header || submittedTimesheet;
        const worklogs = submittedTimesheet?.worklogs ?? [];
        
        // Use totalHours from backend if available, otherwise calculate
        const totalHours = header?.totalHours ?? worklogs?.reduce(
          (sum, w) => sum + (w.hours ?? 0),
          0
        ) ?? 0;
        
        // Map worklogs to entries format
        const mappedEntries = worklogs && worklogs.length > 0 
          ? worklogs.map(worklog => ({
              date: worklog.workDate,
              hours: worklog.hours?.toString() || '0',
              description: worklog.task || worklog.description || '',
              project: worklog.projectId || null
            }))
          : initializeWeekEntries(currentWeek.weekStart);
        
        // Create new state object with proper mapping
        const newWeekState = {
          weekStart: header?.periodStart ?? currentWeek.weekStart,
          status: header?.status ?? "DRAFT",
          locked: header?.locked ?? false,
          entries: mappedEntries,
          totalHours: totalHours,
          approvalMetadata: header?.approvalMetadata || null
        };
        
        console.log('Setting new week state:', newWeekState);
        console.log('New status will be:', header?.status);
        
        // Force state update
        setCurrentWeek(newWeekState);
        
        // Also update timesheets list with calculated totalHours
        const listResponse = await apiFetch('/api/v1/timesheets/me');
        const timesheetsData = listResponse.items || listResponse || [];
        
        // Update the submitted timesheet in the list with correct totalHours
        const updatedTimesheets = Array.isArray(timesheetsData) ? timesheetsData.map(ts => {
          if (ts.id === header?.id) {
            return {
              ...ts,
              totalHours: totalHours,  // Use calculated totalHours from submit response
              status: header?.status,
              submittedAt: header?.submittedAt || ts.submittedAt
            };
          }
          return ts;
        }) : timesheetsData;
        
        setTimesheets(updatedTimesheets);
        
        // Show success message
        setError({
          title: 'Success',
          message: 'Timesheet submitted successfully.'
        });
      } else {
        throw new Error('No timesheet data returned from submit API');
      }
      
    } catch (err) {
      console.error('Submission error:', err);
      handleTimesheetError(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-slate-100 text-slate-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-emerald-100 text-emerald-800',
      LOCKED: 'bg-slate-800 text-white'
    };
    return styles[status] || styles.DRAFT;
  };

  // Week day names
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fmtDateTime = (v) => {
    if (!v) return '—';
    try {
      const d = new Date(v);
      if (!Number.isFinite(d.getTime())) return String(v);
      return d.toLocaleString();
    } catch {
      return String(v);
    }
  };

  const openTimesheetView = async (ts) => {
    try {
      setViewTimesheetOpen(true);
      setViewTimesheetStatus('loading');
      setViewTimesheetError(null);
      setViewTimesheet(null);

      if (!ts?.id) {
        throw new Error('Timesheet id missing');
      }

      const detail = await apiFetch(`/api/v1/timesheets/me/${ts.id}`);
      const payload = detail?.item || detail;
      const header = payload?.header || payload;

      const idsToResolve = [
        header?.submittedBy,
        header?.approvedL1By,
        header?.approvedL2By,
        header?.rejectedBy
      ]
        .filter(Boolean)
        .map((x) => String(x));

      const uniq = Array.from(new Set(idsToResolve));
      const missing = uniq.filter((id) => userNameCache[id] === undefined);
      if (missing.length > 0) {
        try {
          const r = await apiFetch(`/api/v1/app/users/resolve?ids=${encodeURIComponent(missing.join(','))}`);
          const items = Array.isArray(r?.items) ? r.items : [];
          setUserNameCache((prev) => {
            const next = { ...prev };
            for (const it of items) {
              if (it?.id) next[String(it.id)] = it.displayName || null;
            }
            for (const id of missing) {
              if (next[String(id)] === undefined) next[String(id)] = null;
            }
            return next;
          });
        } catch {
          setUserNameCache((prev) => {
            const next = { ...prev };
            for (const id of missing) {
              if (next[String(id)] === undefined) next[String(id)] = null;
            }
            return next;
          });
        }
      }

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

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading timesheets…" />
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

  const isEditable = currentWeek?.status === "DRAFT" || currentWeek?.status === "REJECTED";
  const isReadOnly = !isEditable;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Top Context Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Week</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={currentWeek.weekStart}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    setCurrentWeek(prev => ({ ...prev, weekStart: selectedDate }));
                    loadWeek(selectedDate);   // IMPORTANT
                  }}
                  className="rounded-md border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-slate-600">
                  {currentWeek.weekStart && new Date(currentWeek.weekStart).toLocaleDateString()} - 
                  {currentWeek.weekStart && new Date(new Date(currentWeek.weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            {employeeScope === 'COMPANY' && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                Shared
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-slate-600">Total Hours</div>
              <div className="text-lg font-semibold text-slate-900">{totalHours}</div>
            </div>
            <span className={cx('inline-flex px-3 py-1 text-sm font-medium rounded-full', getStatusBadge(currentWeek.status))}>
              {currentWeek.status}
            </span>
          </div>
        </div>

        {/* Approval Metadata */}
        {currentWeek.approvalMetadata && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <div className="flex items-center gap-6 text-sm text-slate-600">
              {currentWeek.approvalMetadata.submittedAt && (
                <div>Submitted at {new Date(currentWeek.approvalMetadata.submittedAt).toLocaleString()}</div>
              )}
              {currentWeek.approvalMetadata.approvedBy && (
                <div>Approved by {currentWeek.approvalMetadata.approvedBy}</div>
              )}
              {currentWeek.approvalMetadata.approvedAt && (
                <div>Approved at {new Date(currentWeek.approvalMetadata.approvedAt).toLocaleString()}</div>
              )}
              {currentWeek.approvalMetadata.rejectionReason && (
                <div className="text-rose-600">Reason: {currentWeek.approvalMetadata.rejectionReason}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Weekly Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hours</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-8"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {currentWeek.entries.map((entry, index) => {
                const isExpanded = expandedRows.has(index);
                const isFuture = new Date(entry.date) > new Date();
                
                return (
                  <React.Fragment key={index}>
                    <tr className={isFuture ? 'bg-amber-50' : ''}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {weekDays[index]}
                        </div>
                        <div className="text-sm text-slate-600">
                          {new Date(entry.date).toLocaleDateString()}
                        </div>
                        {isFuture && (
                          <div className="text-xs text-amber-600 mt-1">Future date</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max={maxHoursPerDay}
                          step="0.5"
                          value={entry.hours ?? '0'}
                          onChange={(e) => handleEntryChange(index, 'hours', e.target.value)}
                          disabled={isReadOnly}
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:bg-slate-50"
                          placeholder="0"
                        />
                        {parseFloat(entry.hours) > maxHoursPerDay && (
                          <div className="text-xs text-rose-600 mt-1">Max {maxHoursPerDay} hours</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={entry.description ?? ""}
                          onChange={(e) => handleEntryChange(index, 'description', e.target.value)}
                          disabled={isReadOnly}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:bg-slate-50"
                          placeholder="Task description"
                        />
                        {entry.hours && parseFloat(entry.hours) > 0 && !entry.description && (
                          <div className="text-xs text-rose-600 mt-1">Description required</div>
                        )}
                        {/* Auto-save status indicator */}
                        {autoSaveStatus[entry.date] && (
                          <div className={cx(
                            'text-xs mt-1 flex items-center gap-1',
                            autoSaveStatus[entry.date] === 'saving' && 'text-blue-600',
                            autoSaveStatus[entry.date] === 'saved' && 'text-green-600',
                            autoSaveStatus[entry.date] === 'error' && 'text-red-600'
                          )}>
                            {autoSaveStatus[entry.date] === 'saving' && (
                              <>
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                              </>
                            )}
                            {autoSaveStatus[entry.date] === 'saved' && (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Saved
                              </>
                            )}
                            {autoSaveStatus[entry.date] === 'error' && (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Save failed
                              </>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleRowExpansion(index)}
                          disabled={isReadOnly}
                          className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                        >
                          <svg
                            className={cx('w-4 h-4 transition-transform', isExpanded && 'rotate-90')}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50">
                        <td colSpan="4" className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {employeeScope === 'COMPANY' && (
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Division</label>
                                <select
                                  value={entry.division || ''}
                                  onChange={(e) => handleEntryChange(index, 'division', e.target.value)}
                                  disabled={isReadOnly}
                                  className="w-full rounded-md border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">Select Division</option>
                                  {bootstrap?.divisions?.map(div => (
                                    <option key={div.id} value={div.id}>{div.name}</option>
                                  ))}
                                </select>
                                {entry.hours && parseFloat(entry.hours) > 0 && !entry.division && (
                                  <div className="text-xs text-rose-600 mt-1">Division required</div>
                                )}
                              </div>
                            )}
                            
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Project / Program</label>
                              <input
                                type="text"
                                value={entry.project || ''}
                                onChange={(e) => handleEntryChange(index, 'project', e.target.value)}
                                disabled={isReadOnly}
                                className="w-full rounded-md border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Optional"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Work Type</label>
                              <select
                                value={entry.workType || ''}
                                onChange={(e) => handleEntryChange(index, 'workType', e.target.value)}
                                disabled={isReadOnly}
                                className="w-full rounded-md border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select Type</option>
                                <option value="DEVELOPMENT">Development</option>
                                <option value="MEETING">Meeting</option>
                                <option value="REVIEW">Review</option>
                                <option value="PLANNING">Planning</option>
                                <option value="OTHER">Other</option>
                              </select>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Validation Checklist and Submit Button */}
        {!isReadOnly && (
          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className={validationChecks.totalHoursValid ? 'text-emerald-600' : 'text-rose-600'}>
                    {validationChecks.totalHoursValid ? '✓' : '❌'}
                  </span>
                  <span className={validationChecks.totalHoursValid ? 'text-slate-700' : 'text-slate-500'}>
                    Total hours valid
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={validationChecks.descriptionsCompleted ? 'text-emerald-600' : 'text-rose-600'}>
                    {validationChecks.descriptionsCompleted ? '✓' : '❌'}
                  </span>
                  <span className={validationChecks.descriptionsCompleted ? 'text-slate-700' : 'text-slate-500'}>
                    All descriptions completed
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={validationChecks.noFutureEntries ? 'text-emerald-600' : 'text-rose-600'}>
                    {validationChecks.noFutureEntries ? '✓' : '❌'}
                  </span>
                  <span className={validationChecks.noFutureEntries ? 'text-slate-700' : 'text-slate-500'}>
                    No future entries
                  </span>
                </div>
                {employeeScope === 'COMPANY' && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className={validationChecks.divisionValid ? 'text-emerald-600' : 'text-rose-600'}>
                      {validationChecks.divisionValid ? '✓' : '❌'}
                    </span>
                    <span className={validationChecks.divisionValid ? 'text-slate-700' : 'text-slate-500'}>
                      Division assigned
                    </span>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleSubmitWeek}
                disabled={!validationChecks.allValid || submitting}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Week'}
              </button>
            </div>
          </div>
        )}

        {/* Post-submission messages */}
        {currentWeek.status === 'SUBMITTED' && (
          <div className="border-t border-slate-200 p-4 bg-blue-50">
            <div className="flex items-center gap-2 text-blue-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">Timesheet submitted. Awaiting manager review.</span>
            </div>
          </div>
        )}
        
        {currentWeek.status === 'APPROVED' && (
          <div className="border-t border-slate-200 p-4 bg-emerald-50">
            <div className="flex items-center gap-2 text-emerald-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">Timesheet approved.</span>
            </div>
          </div>
        )}
        
        {currentWeek.status === 'REJECTED' && (
          <div className="border-t border-slate-200 p-4 bg-rose-50">
            <div className="flex items-center gap-2 text-rose-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">Timesheet rejected.</span>
            </div>
            {currentWeek.approvalMetadata?.rejectedReason && (
              <div className="mt-2 text-sm text-rose-700">
                Reason: {currentWeek.approvalMetadata.rejectedReason}
              </div>
            )}
          </div>
        )}
        
        {currentWeek.status === 'LOCKED' && (
          <div className="border-t border-slate-200 p-4 bg-slate-100">
            <div className="flex items-center gap-2 text-slate-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm">This week is locked due to month close.</span>
            </div>
          </div>
        )}
      </div>

      {/* Previous Timesheets */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Previous Timesheets</h2>
        
        {(() => {
          // Filter out DRAFT weeks and show all submitted/approved timesheets
          const previousWeeks = timesheets
            .filter(week => week.status !== 'DRAFT')
            .sort((a, b) => new Date(b.periodStart) - new Date(a.periodStart));
          
          console.log('Previous weeks data:', previousWeeks);
          console.log('Timesheets data:', timesheets);
          
          return previousWeeks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2">📊</div>
              <div>No previous timesheets found</div>
              <div className="text-sm mt-1">Your submitted timesheets will appear here</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Week Start</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted On</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {previousWeeks.map((timesheet) => {
                    // Use fetched total hours or fallback to existing value
                    const totalHours = previousTimesheetsHours[timesheet.id] ?? timesheet.totalHours ?? 0;
                    
                    return (
                      <tr key={timesheet.id || timesheet.periodStart}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                          {timesheet.periodStart ? new Date(timesheet.periodStart).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                          {totalHours}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={cx('inline-flex px-2 py-1 text-xs font-medium rounded-full', getStatusBadge(timesheet.status))}>
                            {timesheet.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                          {timesheet.submittedAt ? new Date(timesheet.submittedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => openTimesheetView(timesheet)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {viewTimesheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-900">Timesheet</div>
                  <div className="text-xs text-slate-600 mt-0.5">{viewTimesheet?.id ? `ID: ${viewTimesheet.id}` : ''}</div>
                </div>
                <button
                  onClick={closeTimesheetView}
                  className="p-2 rounded-lg hover:bg-white hover:bg-opacity-70 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {viewTimesheetStatus === 'loading' && <LoadingState message="Loading timesheet…" />}
              {viewTimesheetStatus === 'error' && <ErrorState error={viewTimesheetError} />}

              {viewTimesheetStatus === 'ready' && viewTimesheet && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Period</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">
                        {viewTimesheet.periodStart || '—'} to {viewTimesheet.periodEnd || '—'}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">{viewTimesheet.status || '—'}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-900 mb-2">Approval Timeline</div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-800">Submitted</div>
                            <div className="text-xs text-slate-600 mt-1">{fmtDateTime(viewTimesheet.submittedAt)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold text-slate-500">By</div>
                            <div className="text-sm font-medium text-slate-900">{displayNameOrId(viewTimesheet.submittedBy)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-blue-800">Approved by L1</div>
                            <div className="text-xs text-blue-700 mt-1">{fmtDateTime(viewTimesheet.approvedL1At)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold text-blue-700">By</div>
                            <div className="text-sm font-medium text-blue-900">{displayNameOrId(viewTimesheet.approvedL1By)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-emerald-800">Approved by L2</div>
                            <div className="text-xs text-emerald-700 mt-1">{fmtDateTime(viewTimesheet.approvedL2At)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold text-emerald-700">By</div>
                            <div className="text-sm font-medium text-emerald-900">{displayNameOrId(viewTimesheet.approvedL2By)}</div>
                          </div>
                        </div>
                      </div>

                      {viewTimesheet.rejectedAt && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-semibold text-rose-800">Rejected</div>
                              <div className="text-xs text-rose-700 mt-1">{fmtDateTime(viewTimesheet.rejectedAt)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-semibold text-rose-700">By</div>
                              <div className="text-sm font-medium text-rose-900">{displayNameOrId(viewTimesheet.rejectedBy)}</div>
                            </div>
                          </div>
                          {viewTimesheet.rejectedReason ? (
                            <div className="mt-3 text-sm text-rose-800 whitespace-pre-wrap">Reason: {viewTimesheet.rejectedReason}</div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      onClick={closeTimesheetView}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
