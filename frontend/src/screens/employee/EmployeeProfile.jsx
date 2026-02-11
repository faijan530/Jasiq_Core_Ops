import React, { useEffect, useState } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';

export function EmployeeProfile() {
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
        <LoadingState message="Loading your profile…" />
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
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">My Profile</h1>
        <p className="text-slate-600">Your personal and employment information</p>
      </div>

      {/* Personal Information Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-medium text-slate-500">Full Name</div>
            <div className="mt-1 text-sm text-slate-900">{formatName(employee)}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Email</div>
            <div className="mt-1 text-sm text-slate-900">{employee?.email || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Phone</div>
            <div className="mt-1 text-sm text-slate-900">{employee?.phone || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Employee ID</div>
            <div className="mt-1 text-sm text-slate-900 font-mono">{employee?.employeeCode || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Joining Date</div>
            <div className="mt-1 text-sm text-slate-900">
              {employee?.createdAt ? new Date(employee.createdAt).toLocaleDateString() : '—'}
            </div>
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
        
        {/* Helper text */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">ℹ️</span>
            <div className="text-sm text-slate-700">
              <strong>For profile corrections, please contact HR.</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Employment Information Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Employment Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-medium text-slate-500">Designation</div>
            <div className="mt-1 text-sm text-slate-900">{employee?.designation || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Reporting Manager</div>
            <div className="mt-1 text-sm text-slate-900">{employee?.reportingManager || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Employment Type</div>
            <div className="mt-1 text-sm text-slate-900">
              {employee?.scope === 'COMPANY' ? 'Company' : employee?.scope === 'DIVISION' ? 'Division' : '—'}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Division</div>
            <div className="mt-1 text-sm text-slate-900">
              {employee?.scope === 'DIVISION' ? (employee?.primaryDivisionName || '—') : 'Not applicable'}
            </div>
          </div>
        </div>
      </div>

      {/* Important Information */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
        <h3 className="text-lg font-semibold text-amber-900 mb-3">Important Information</h3>
        <div className="space-y-2 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <span className="mt-0.5">🔒</span>
            <div>Employee ID is immutable and cannot be changed.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5">💼</span>
            <div>Employment scope and division changes require HR approval.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5">📞</span>
            <div>Keep your contact information updated for important communications.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
