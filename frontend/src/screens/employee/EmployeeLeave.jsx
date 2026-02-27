import React, { useEffect, useMemo, useState } from 'react';
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
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [userNameCache, setUserNameCache] = useState({});
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [monthLocked, setMonthLocked] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Get balance for a specific leave type
  const getBalanceForType = (typeCode) => {
    if (!leaveBalance || !Array.isArray(leaveBalance.items)) {
      return null;
    }
    
    return leaveBalance.items.find(b => 
      String(b.leaveType?.code || '').toUpperCase() === String(typeCode || '').toUpperCase()
    );
  };

  useEffect(() => {
    async function fetchLeaveData() {
      try {
        setLoading(true);
        
        // Fetch leave requests
        const requestsResponse = await apiFetch('/api/v1/leave/me');
        const requestsData = requestsResponse.items || requestsResponse || [];
        setLeaveRequests(Array.isArray(requestsData) ? requestsData : []);
        
        // Fetch leave balance
        const currentYear = new Date().getFullYear();
        const balanceResponse = await apiFetch(`/api/v1/leave/balance/me?year=${currentYear}`);
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
          leaveTypeId: formData.leaveType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason,
          unit: "FULL_DAY"
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
      
      // Refresh data
      const requestsResponse = await apiFetch('/api/v1/leave/me');
      const requestsData = requestsResponse.items || requestsResponse || [];
      setLeaveRequests(Array.isArray(requestsData) ? requestsData : []);
      
      const balanceResponse = await apiFetch('/api/v1/leave/balance/me');
      setLeaveBalance(balanceResponse || {});
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await apiFetch(`/api/v1/leave/me/requests/${requestId}/cancel`, {
        method: 'POST',
        body: { reason: 'Cancelled by employee' }
      });
      
      // Refresh requests
      const requestsResponse = await apiFetch('/api/v1/leave/me');
      const requestsData = requestsResponse.items || requestsResponse || [];
      setLeaveRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (err) {
      setError(err);
    }
  };

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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'APPROVED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'REJECTED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'CANCELLED':
        return 'bg-gray-50 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getLeaveBalanceForType = (typeCode) => {
    // Find matching leave type from API data
    const apiType = leaveTypes.find(t => 
      t.code === typeCode || 
      t.name?.toLowerCase().includes(typeCode.toLowerCase()) ||
      t.displayName?.toLowerCase().includes(typeCode.toLowerCase())
    );
    
    if (apiType && leaveBalance[apiType.id]) {
      return leaveBalance[apiType.id];
    }
    
    // Fallback to generic balance
    return leaveBalance[typeCode.toLowerCase()] || { total: 0, used: 0, available: 0 };
  };

  const getRemainingCL = () => {
    const clBalance = getLeaveBalanceForType('CL');
    return clBalance.available || 0;
  };

  const getTotalRemainingBalance = () => {
    let total = 0;
    const types = Array.isArray(leaveTypes) ? leaveTypes : [];
    for (const t of types) {
      const balance = getBalanceForType(t.code);
      const available = balance ? balance.availableBalance || 0 : 0;
      total += available;
    }
    return total;
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate && !endDate) return '—';
    if (!endDate) return new Date(startDate).toLocaleDateString();
    if (!startDate) return new Date(endDate).toLocaleDateString();
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString();
    }
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return '—';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const canCancel = (status) => status === 'PENDING';

  const resolveUserNames = async (ids) => {
    const uniq = Array.from(new Set((ids || []).filter(Boolean).map((x) => String(x))));
    const missing = uniq.filter((id) => userNameCache[id] === undefined);
    if (missing.length === 0) return;

    try {
      const res = await apiFetch(`/api/v1/app/users/resolve?ids=${encodeURIComponent(missing.join(','))}`);
      const items = Array.isArray(res?.items) ? res.items : [];

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
  };

  useEffect(() => {
    if (!selectedRequest) return;
    resolveUserNames([
      selectedRequest.approvedL1By,
      selectedRequest.approvedL2By,
      selectedRequest.rejectedBy,
      selectedRequest.cancelledBy
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRequest?.id]);

  const displayNameOrId = (id) => {
    if (!id) return '—';
    const v = userNameCache[String(id)];
    return v || String(id);
  };

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

  const ApprovalRow = ({ label, by, at, tone }) => {
    const toneCls =
      tone === 'green'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : tone === 'blue'
          ? 'bg-blue-50 border-blue-200 text-blue-800'
          : tone === 'red'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-slate-50 border-slate-200 text-slate-800';

    return (
      <div className={`rounded-xl border p-4 ${toneCls}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">{label}</div>
            <div className="text-xs opacity-80 mt-1">{at ? fmtDateTime(at) : '—'}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold opacity-70">By</div>
            <div className="text-sm font-medium">{displayNameOrId(by)}</div>
          </div>
        </div>
      </div>
    );
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

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-slate-50 via-white to-blue-50 min-h-screen">
      {/* Month Lock Warning */}
      {monthLocked && (
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-amber-800 font-medium">Leave records for this month are locked.</p>
          </div>
        </div>
      )}

      {/* Leave Balance Cards */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-slate-900">Leave Balance</h2>
          </div>
          <div className="text-right">
            <button
              onClick={() => setShowApplyForm(true)}
              disabled={monthLocked}
              className="px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl hover:from-slate-800 hover:to-slate-600 transition-all duration-200 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Apply for Leave
              </span>
            </button>
            {getTotalRemainingBalance() === 0 && (
              <div className="text-xs text-amber-600 mt-2 font-medium">
                You currently have 0 remaining leave balance.
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Array.isArray(leaveTypes) ? leaveTypes : []).map((t, index) => {
            const cardGradients = [
              'from-blue-50 to-indigo-50 border-blue-200',
              'from-emerald-50 to-teal-50 border-emerald-200', 
              'from-purple-50 to-pink-50 border-purple-200'
            ];
            const iconColors = [
              'text-blue-600',
              'text-emerald-600', 
              'text-purple-600'
            ];
            const icons = [
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />,
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            ];
            
            const balance = getBalanceForType(t.code);
            
            // Calculate values from API or default to 0
            const available = balance ? (balance.availableBalance || 0) : 0;
            const granted = balance ? (balance.grantedBalance || 0) : 0;
            const used = balance ? (balance.consumedBalance || 0) : 0;
            
            return (
              <div key={t.id || t.code || index} className={`bg-gradient-to-br ${cardGradients[index % cardGradients.length]} border rounded-xl p-5 h-full flex flex-col shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg bg-white bg-opacity-70 ${iconColors[index % iconColors.length]}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {icons[index % icons.length]}
                      </svg>
                    </div>
                    <div className="text-sm font-semibold text-slate-700">
                      {t.displayName || t.name || t.code || 'Leave'}
                    </div>
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-slate-600 font-medium">Remaining</span>
                      <span className="text-2xl font-bold text-slate-900">
                        {available}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-slate-500">Total</span>
                      <span className="text-sm font-medium text-slate-500">{granted}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-slate-500">Used</span>
                      <span className="text-sm font-medium text-slate-500">{used}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Policy Info */}
      <div className="mb-10 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong className="font-semibold text-slate-900">Policy Notice:</strong> Approved leave automatically updates attendance. Leave does not directly impact payroll in v1.
          </p>
        </div>
      </div>

      {/* Leave History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-slate-900">Leave History</h2>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date Range
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Leave Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Days
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {leaveRequests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center bg-gradient-to-br from-slate-50 to-blue-50">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-lg font-semibold text-slate-900">
                        You have not submitted any leave requests yet.
                      </div>
                      <div className="text-sm text-slate-600 max-w-md">
                        Apply for leave to record planned time off and track your attendance.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                leaveRequests.map((request, index) => (
                  <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                      {formatDateRange(request.startDate, request.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {request.leaveType?.displayName || request.leaveType?.name || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">
                      {request.days || calculateDays(request.startDate, request.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeClass(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          onClick={() => {
                            setSelectedRequest(request);
                          }}
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        {canCancel(request.status) && (
                          <button
                            className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={() => handleCancelRequest(request.id)}
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl transform transition-all">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Apply for Leave</h3>
                <button
                  onClick={() => setShowApplyForm(false)}
                  className="p-2 rounded-lg hover:bg-white hover:bg-opacity-70 transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleApplyLeave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Leave Type</label>
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id || type.name} value={type.id || type.name}>
                      {type.displayName || type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                    min={formData.startDate}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Reason</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  placeholder="Please provide a reason for your leave request"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowApplyForm(false)}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-lg hover:from-slate-800 hover:to-slate-600 disabled:from-slate-300 disabled:to-slate-400 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {submitting ? 'Submitting...' : 'Apply Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-900">Leave Request</div>
                  <div className="text-xs text-slate-600 mt-0.5">ID: {selectedRequest.id}</div>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 rounded-lg hover:bg-white hover:bg-opacity-70 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date Range</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {formatDateRange(selectedRequest.startDate, selectedRequest.endDate)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</div>
                  <div className="mt-1">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeClass(selectedRequest.status)}`}>
                      {getStatusLabel(selectedRequest.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-900 mb-2">Approval Timeline</div>
                <div className="grid grid-cols-1 gap-3">
                  <ApprovalRow label="Approved by L1" by={selectedRequest.approvedL1By} at={selectedRequest.approvedL1At} tone="blue" />
                  <ApprovalRow label="Approved by L2" by={selectedRequest.approvedL2By} at={selectedRequest.approvedL2At} tone="green" />
                  {selectedRequest.rejectedAt && (
                    <ApprovalRow label="Rejected" by={selectedRequest.rejectedBy} at={selectedRequest.rejectedAt} tone="red" />
                  )}
                </div>
                {selectedRequest.rejectionReason ? (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                    <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">Rejection Reason</div>
                    <div className="mt-1 whitespace-pre-wrap">{selectedRequest.rejectionReason}</div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
