import React, { useState, useEffect } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState, EmptyState } from '../../components/States.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';

export function ManagerMyTimesheetsPage() {
  const { bootstrap } = useBootstrap();
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date().toISOString().slice(0, 10));

  const userId = bootstrap?.user?.id;

  // Fetch timesheets
  const fetchTimesheets = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch(`/api/v1/timesheets/me?week=${selectedWeek}`);
      setTimesheets(response.items || []);
    } catch (err) {
      console.error('Failed to fetch timesheets:', err);
      setError(err.message || 'Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, [userId, selectedWeek]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getTotalHours = (timesheet) => {
    return timesheet.entries?.reduce((total, entry) => total + (entry.hours || 0), 0) || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="My Timesheets" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="My Timesheets" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorState error={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="My Timesheets" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Week Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select Week
          </label>
          <input
            type="week"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {timesheets.length === 0 ? (
          <EmptyState 
            title="No timesheets found"
            description="There are no timesheets for the selected week."
          />
        ) : (
          <div className="space-y-6">
            {timesheets.map((timesheet) => (
              <div key={timesheet.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-slate-900">
                        Week: {formatDate(timesheet.weekStart)} - {formatDate(timesheet.weekEnd)}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Total Hours: {getTotalHours(timesheet)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(timesheet.status)}
                      {timesheet.status === 'DRAFT' && (
                        <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Task
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {timesheet.entries?.map((entry, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">
                              {formatDate(entry.date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">
                              {entry.project || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">
                              {entry.task || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">
                              {entry.hours || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-900 max-w-xs truncate">
                              {entry.description || '-'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
