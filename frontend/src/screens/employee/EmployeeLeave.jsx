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

  const getBalanceForType = (typeCode) => {
    if (!leaveBalance || !Array.isArray(leaveBalance.items)) return null;
    return leaveBalance.items.find(b => String(b.leaveType?.code || '').toUpperCase() === String(typeCode || '').toUpperCase());
  };

  useEffect(() => {
    async function fetchLeaveData() {
      try {
        setLoading(true);
        const [requestsResponse, balanceResponse, typesResponse] = await Promise.all([
          apiFetch('/api/v1/leave/me'),
          apiFetch(`/api/v1/leave/balance/me?year=${new Date().getFullYear()}`),
          apiFetch('/api/v1/leave/types')
        ]);
        
        setLeaveRequests(Array.isArray(requestsResponse.items || requestsResponse) ? (requestsResponse.items || requestsResponse) : []);
        setLeaveBalance(balanceResponse || {});
        setLeaveTypes(Array.isArray(typesResponse.items || typesResponse) ? (typesResponse.items || typesResponse) : []);
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
    setFormData(prev => ({ ...prev, [name]: value }));
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
      setFormData({ leaveType: '', startDate: '', endDate: '', reason: '' });
      setShowApplyForm(false);
      
      const [requestsRes, balanceRes] = await Promise.all([
        apiFetch('/api/v1/leave/me'),
        apiFetch('/api/v1/leave/balance/me')
      ]);
      setLeaveRequests(Array.isArray(requestsRes.items || requestsRes) ? (requestsRes.items || requestsRes) : []);
      setLeaveBalance(balanceRes || {});
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
      const requestsRes = await apiFetch('/api/v1/leave/me');
      setLeaveRequests(Array.isArray(requestsRes.items || requestsRes) ? (requestsRes.items || requestsRes) : []);
    } catch (err) {
      setError(err);
    }
  };

  const getStatusLabel = (status) => {
    const labels = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Cancelled' };
    return labels[status] || status || '—';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'CANCELLED': return 'bg-slate-50 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate && !endDate) return '—';
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (s.toDateString() === e.toDateString()) return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return '—';
    const diff = Math.abs(new Date(endDate) - new Date(startDate));
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const resolveUserNames = async (ids) => {
    const uniq = Array.from(new Set((ids || []).filter(Boolean).map(String)));
    const missing = uniq.filter(id => userNameCache[id] === undefined);
    if (missing.length === 0) return;
    try {
      const res = await apiFetch(`/api/v1/app/users/resolve?ids=${encodeURIComponent(missing.join(','))}`);
      const items = Array.isArray(res?.items) ? res.items : [];
      setUserNameCache(prev => {
        const next = { ...prev };
        items.forEach(it => { if (it?.id) next[String(it.id)] = it.displayName; });
        missing.forEach(id => { if (next[id] === undefined) next[id] = null; });
        return next;
      });
    } catch {
      setUserNameCache(prev => {
        const next = { ...prev };
        missing.forEach(id => { if (next[id] === undefined) next[id] = null; });
        return next;
      });
    }
  };

  useEffect(() => {
    if (selectedRequest) {
      resolveUserNames([selectedRequest.approvedL1By, selectedRequest.approvedL2By, selectedRequest.rejectedBy, selectedRequest.cancelledBy]);
    }
  }, [selectedRequest?.id]);

  const displayNameOrId = (id) => id ? (userNameCache[String(id)] || String(id)) : '—';

  const ApprovalRow = ({ label, by, at, tone }) => {
    const tones = {
      green: 'bg-emerald-50 border-emerald-100 text-emerald-800',
      blue: 'bg-blue-50 border-blue-100 text-blue-800',
      red: 'bg-rose-50 border-rose-100 text-rose-800',
      gray: 'bg-slate-50 border-slate-100 text-slate-800'
    };
    return (
      <div className={`rounded-2xl border p-4 ${tones[tone || 'gray']}`}>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider opacity-60">{label}</div>
            <div className="text-sm font-bold mt-1">{displayNameOrId(by)}</div>
          </div>
          <div className="text-right text-xs opacity-60">
            {at ? new Date(at).toLocaleString() : 'Pending'}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-8"><LoadingState /></div>;
  if (error) return <div className="p-8"><ErrorState error={error} /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Leave Management</h1>
            <p className="text-blue-100 mt-2 opacity-90">Plan your time off and track your leave balances.</p>
          </div>
          <button
            onClick={() => setShowApplyForm(true)}
            className="px-8 py-4 bg-white text-blue-700 rounded-2xl font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Request Time Off
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leaveTypes.map((t, idx) => {
          const balance = getBalanceForType(t.code);
          const available = balance?.availableBalance || 0;
          const granted = balance?.grantedBalance || 0;
          const consumed = balance?.consumedBalance || 0;
          const colors = [
            'from-blue-50 to-indigo-50 border-blue-100 text-blue-700',
            'from-emerald-50 to-teal-50 border-emerald-100 text-emerald-700',
            'from-purple-50 to-pink-50 border-purple-100 text-purple-700'
          ];
          const color = colors[idx % colors.length];

          return (
            <div key={t.id || t.code} className={`bg-gradient-to-br ${color} border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all`}>
              <div className="flex justify-between items-start mb-6">
                <div className="font-bold text-lg">{t.displayName || t.name}</div>
                <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-semibold opacity-70">Available</span>
                  <span className="text-3xl font-black">{available} Days</span>
                </div>
                <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                  <div className="h-full bg-current opacity-30" style={{ width: `${(consumed / (granted || 1)) * 100}%` }}></div>
                </div>
                <div className="flex justify-between text-xs font-bold opacity-60">
                  <span>Total: {granted}</span>
                  <span>Used: {consumed}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-900">Request History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Period</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Days</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leaveRequests.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">No leave requests found.</td></tr>
              ) : (
                leaveRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{formatDateRange(r.startDate, r.endDate)}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                        {r.leaveType?.displayName || r.leaveType?.name || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-slate-700">{r.days || calculateDays(r.startDate, r.endDate)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(r.status)}`}>
                        {getStatusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedRequest(r)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        {r.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelRequest(r.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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

      {showApplyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">Apply for Leave</h3>
              <button onClick={() => setShowApplyForm(false)} className="hover:bg-white/20 p-2 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleApplyLeave} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Leave Type</label>
                <select name="leaveType" value={formData.leaveType} onChange={handleInputChange} required className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-medium">
                  <option value="">Select a type</option>
                  {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.displayName || t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Start Date</label>
                  <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">End Date</label>
                  <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} required min={formData.startDate} className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-medium" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Reason</label>
                <textarea name="reason" value={formData.reason} onChange={handleInputChange} required rows="3" className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-medium resize-none" placeholder="Provide a brief explanation..."></textarea>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowApplyForm(false)} className="flex-1 py-4 font-bold text-slate-600 hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 transition-all">{submitting ? 'Submitting...' : 'Send Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Request Details</h3>
                <div className="text-xs font-bold text-slate-400 mt-0.5">ID: {selectedRequest.id}</div>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="hover:bg-slate-200 p-2 rounded-xl text-slate-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Period</div>
                  <div className="text-sm font-bold mt-1 text-slate-900">{formatDateRange(selectedRequest.startDate, selectedRequest.endDate)}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Days</div>
                  <div className="text-sm font-bold mt-1 text-slate-900">{selectedRequest.days || calculateDays(selectedRequest.startDate, selectedRequest.endDate)} Days</div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Approval Timeline</div>
                <div className="space-y-3">
                  <ApprovalRow label="L1 Manager" by={selectedRequest.approvedL1By} at={selectedRequest.approvedL1At} tone="blue" />
                  <ApprovalRow label="L2 Manager" by={selectedRequest.approvedL2By} at={selectedRequest.approvedL2At} tone="green" />
                  {selectedRequest.rejectedAt && <ApprovalRow label="Rejected" by={selectedRequest.rejectedBy} at={selectedRequest.rejectedAt} tone="red" />}
                </div>
              </div>
              {selectedRequest.rejectionReason && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                  <div className="text-xs font-bold text-rose-700 uppercase tracking-widest mb-1">Rejection Reason</div>
                  <p className="text-sm text-rose-800 font-medium">{selectedRequest.rejectionReason}</p>
                </div>
              )}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Reason for Leave</div>
                <p className="text-sm text-slate-800 font-medium leading-relaxed">{selectedRequest.reason || 'No reason provided.'}</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg">Close Details</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

