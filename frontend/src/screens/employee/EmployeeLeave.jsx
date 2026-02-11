import React, { useEffect, useState } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';

export function EmployeeLeave() {
  const { bootstrap } = useBootstrap();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({});
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    async function fetchLeaveData() {
      try {
        setLoading(true);
        
        // Fetch leave requests
        const requestsResponse = await apiFetch('/api/v1/leave/me');
        const requestsData = requestsResponse.items || requestsResponse || [];
        setLeaveRequests(Array.isArray(requestsData) ? requestsData : []);
        
        // Fetch leave balance
        const balanceResponse = await apiFetch('/api/v1/leave/balance/me');
        setLeaveBalance(balanceResponse || {});
        
        // Fetch leave types
        const typesResponse = await apiFetch('/api/v1/leave/types');
        const typesData = typesResponse.items || typesResponse || [];
        setLeaveTypes(Array.isArray(typesData) ? typesData : []);
        
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaveData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      await apiFetch('/api/v1/leave/me', {
        method: 'POST',
        body: {
          leaveType: formData.leaveType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason
        }
      });
      
      // Reset form and refresh data
      setFormData({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: ''
      });
      setShowApplyForm(false);
      
      // Refresh leave requests
      const requestsResponse = await apiFetch('/api/v1/leave/me');
      const requestsData = requestsResponse.items || requestsResponse || [];
      setLeaveRequests(Array.isArray(requestsData) ? requestsData : []);
      
      // Refresh leave balance
      const balanceResponse = await apiFetch('/api/v1/leave/balance/me');
      setLeaveBalance(balanceResponse || {});
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading leave data…" />
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
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status || '—';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Leave</h1>
          <p className="text-slate-600">Apply for leave and view your history</p>
        </div>
        <button
          onClick={() => setShowApplyForm(true)}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          Apply for Leave
        </button>
      </div>

      {/* Leave Balance Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Leave Balance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(leaveBalance).map(([type, balance]) => (
            <div key={type} className="bg-slate-50 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-600 capitalize">
                {type.replace('_', ' ').toLowerCase()}
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {balance.available || 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {balance.used || 0} used this year
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leave History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Leave History</h2>
        
        {leaveRequests.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <div className="text-4xl mb-2">✈️</div>
            <div>No leave requests found</div>
            <div className="text-sm mt-1">Apply for leave to see your history here</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Leave Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">End Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Applied On</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {leaveRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900 capitalize">
                      {request.leaveType?.replace('_', ' ').toLowerCase() || '—'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {request.startDate ? new Date(request.startDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {request.endDate ? new Date(request.endDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {request.days || '—'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showApplyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowApplyForm(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Apply for Leave</h3>
              <button
                onClick={() => setShowApplyForm(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id || type.name} value={type.name || type.id}>
                      {type.displayName || type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                    min={formData.startDate}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Please provide a reason for your leave request"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowApplyForm(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-300 transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Apply Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Important Information */}
      <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Important Information</h3>
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-start gap-2">
            <span className="mt-0.5">📅</span>
            <div>Apply for leave at least 2 days in advance for planned leaves.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5">⏰</span>
            <div>Emergency leaves may require immediate manager approval.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5">✅</span>
            <div>Wait for approval before taking leave.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
