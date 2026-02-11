import React, { useEffect, useState } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';

export function EmployeeTimesheets() {
  const { bootstrap } = useBootstrap();
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchTimesheetsData() {
      try {
        setLoading(true);
        // Fetch current employee's timesheets
        const response = await apiFetch('/api/v1/timesheets/me');
        const timesheetsData = response.items || response || [];
        setTimesheets(Array.isArray(timesheetsData) ? timesheetsData : []);
        setError(null);
        
        // Find current week's timesheet
        const today = new Date();
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const currentWeekData = timesheetsData.find(ts => 
          ts.weekStart && new Date(ts.weekStart).toDateString() === weekStart.toDateString()
        );
        setCurrentWeek(currentWeekData || {
          weekStart: weekStart.toISOString().split('T')[0],
          entries: Array(7).fill(null).map((_, i) => ({
            date: new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hours: '',
            description: ''
          }))
        });
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchTimesheetsData();
  }, []);

  const handleHoursChange = (dayIndex, value) => {
    const updatedWeek = { ...currentWeek };
    updatedWeek.entries = [...updatedWeek.entries];
    updatedWeek.entries[dayIndex] = {
      ...updatedWeek.entries[dayIndex],
      hours: value
    };
    setCurrentWeek(updatedWeek);
  };

  const handleDescriptionChange = (dayIndex, value) => {
    const updatedWeek = { ...currentWeek };
    updatedWeek.entries = [...updatedWeek.entries];
    updatedWeek.entries[dayIndex] = {
      ...updatedWeek.entries[dayIndex],
      description: value
    };
    setCurrentWeek(updatedWeek);
  };

  const handleSubmitWeek = async () => {
    try {
      setSubmitting(true);
      await apiFetch('/api/v1/timesheets/me', {
        method: 'POST',
        body: currentWeek
      });
      
      // Refresh timesheets data
      const response = await apiFetch('/api/v1/timesheets/me');
      const timesheetsData = response.items || response || [];
      setTimesheets(Array.isArray(timesheetsData) ? timesheetsData : []);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
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

  const getStatusLabel = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'Draft';
      case 'SUBMITTED':
        return 'Submitted';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status || 'Draft';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const totalHours = currentWeek.entries?.reduce((sum, entry) => sum + (parseFloat(entry.hours) || 0), 0) || 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Timesheets</h1>
        <p className="text-slate-600">Fill and submit your weekly timesheets</p>
      </div>

      {/* Current Week Timesheet */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Current Week: {currentWeek.weekStart ? new Date(currentWeek.weekStart).toLocaleDateString() : '—'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600">
              Total Hours: <span className="font-semibold text-slate-900">{totalHours}</span>
            </div>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(currentWeek.status)}`}>
              {getStatusLabel(currentWeek.status)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Day</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hours</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {currentWeek.entries?.map((entry, index) => (
                <tr key={index}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {weekDays[index]}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                    {entry.date ? new Date(entry.date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={entry.hours || ''}
                      onChange={(e) => handleHoursChange(index, e.target.value)}
                      disabled={currentWeek.status === 'SUBMITTED' || currentWeek.status === 'APPROVED'}
                      className="w-20 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:bg-slate-50"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={entry.description || ''}
                      onChange={(e) => handleDescriptionChange(index, e.target.value)}
                      disabled={currentWeek.status === 'SUBMITTED' || currentWeek.status === 'APPROVED'}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:bg-slate-50"
                      placeholder="Task description"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmitWeek}
            disabled={currentWeek.status === 'SUBMITTED' || currentWeek.status === 'APPROVED' || submitting || totalHours === 0}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : currentWeek.status === 'SUBMITTED' ? 'Already Submitted' : 'Submit Week'}
          </button>
        </div>
      </div>

      {/* Previous Timesheets */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Previous Timesheets</h2>
        
        {timesheets.length === 0 ? (
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {timesheets
                  .filter(ts => ts.weekStart !== currentWeek.weekStart)
                  .map((timesheet) => (
                  <tr key={timesheet.id || timesheet.weekStart}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {timesheet.weekStart ? new Date(timesheet.weekStart).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {timesheet.totalHours || timesheet.entries?.reduce((sum, entry) => sum + (parseFloat(entry.hours) || 0), 0) || 0}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(timesheet.status)}`}>
                        {getStatusLabel(timesheet.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {timesheet.submittedAt ? new Date(timesheet.submittedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Important Information */}
      <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Important Information</h3>
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-start gap-2">
            <span className="mt-0.5">⏰</span>
            <div>Submit your timesheet weekly by the end of the week.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5">🔒</span>
            <div>Submitted timesheets cannot be modified.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5">✅</span>
            <div>Wait for manager approval before starting a new week.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
