import React, { useEffect, useState } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';

export function EmployeeDashboard() {
  const { bootstrap } = useBootstrap();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchEmployeeData() {
      try {
        setLoading(true);
        // Fetch current employee's own data
        const response = await apiFetch('/api/v1/employees/me');
        setEmployee(response.item || response);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchEmployeeData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading your dashboard…" />
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

  const formatName = (emp) => {
    if (!emp) return '—';
    return `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'ON_HOLD':
        return 'On-hold';
      case 'EXITED':
        return 'Exited';
      default:
        return status || '—';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'ON_HOLD':
        return 'bg-amber-100 text-amber-800';
      case 'EXITED':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Welcome, {formatName(employee)}!
        </h1>
        <p className="text-slate-600">Here's an overview of your employment information</p>
      </div>

      {/* Employment Information Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Employment Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-sm font-medium text-slate-500">Employee ID</div>
            <div className="mt-1 text-sm text-slate-900 font-mono">{employee?.employeeCode || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Designation</div>
            <div className="mt-1 text-sm text-slate-900">{employee?.designation || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Reporting Manager</div>
            <div className="mt-1 text-sm text-slate-900">{employee?.reportingManager || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Employment Status</div>
            <div className="mt-1">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(employee?.status)}`}>
                {getStatusLabel(employee?.status)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Attendance Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">📅</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Attendance</h3>
                <p className="text-sm text-slate-600">Today</p>
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-700">
            <div className="font-medium">Not Marked</div>
            <div className="text-xs text-slate-500 mt-1">Mark your attendance for today</div>
          </div>
        </div>

        {/* Timesheets Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">📊</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Timesheets</h3>
                <p className="text-sm text-slate-600">This week</p>
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-700">
            <div className="font-medium">Pending</div>
            <div className="text-xs text-slate-500 mt-1">Submit your weekly timesheet</div>
          </div>
        </div>

        {/* Leave Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">✈️</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Leave</h3>
                <p className="text-sm text-slate-600">Balance</p>
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-700">
            <div className="font-medium">12 days</div>
            <div className="text-xs text-slate-500 mt-1">Annual leave available</div>
          </div>
        </div>

        {/* Notices Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">📢</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Notices</h3>
                <p className="text-sm text-slate-600">Updates</p>
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-700">
            <div className="font-medium">No new notices</div>
            <div className="text-xs text-slate-500 mt-1">Check back later for updates</div>
          </div>
        </div>
      </div>

      {/* Quick Info Section */}
      <div className="mt-8 bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Quick Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium text-slate-700">Joining Date</div>
            <div className="text-slate-600">
              {employee?.createdAt ? new Date(employee.createdAt).toLocaleDateString() : '—'}
            </div>
          </div>
          <div>
            <div className="font-medium text-slate-700">Email</div>
            <div className="text-slate-600">{employee?.email || '—'}</div>
          </div>
          <div>
            <div className="font-medium text-slate-700">Phone</div>
            <div className="text-slate-600">{employee?.phone || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
