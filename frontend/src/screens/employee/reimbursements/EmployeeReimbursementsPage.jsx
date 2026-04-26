import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorState, LoadingState, EmptyState } from '../../../components/States.jsx';
import { useBootstrap } from '../../../state/bootstrap.jsx';
import { reimbursementApi } from '../../../services/reimbursement.api.js';
import { ReimbursementTable } from '../../../components/reimbursement/ReimbursementTable.jsx';

function hasPerm(perms, code) {
  const p = perms || [];
  return p.includes('SYSTEM_FULL_ACCESS') || p.includes(code);
}

export function EmployeeReimbursementsPage() {
  const navigate = useNavigate();
  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];
  const canCreate = hasPerm(permissions, 'REIMBURSEMENT_CREATE_SELF');
  const canView = hasPerm(permissions, 'REIMBURSEMENT_VIEW_SELF');

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [statusFilter, setStatusFilter] = useState('');
  const [month, setMonth] = useState('');

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await reimbursementApi.getMyReimbursements({ page, pageSize, status: statusFilter || null, month: month || null });
      setData(payload);
      setStatus('ready');
    } catch (e) {
      setError(e);
      setStatus('error');
    }
  }

  useEffect(() => {
    if (!canView) return;
    load();
  }, [page, pageSize, statusFilter, month, canView]);

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const total = useMemo(() => Number(data?.total || 0), [data]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  if (!canView) {
    return (
      <div className="p-8">
        <EmptyState title="Access Restricted" description="You don't have the necessary credentials to view reimbursement history." icon="🚫" />
      </div>
    );
  }

  if (status === 'loading') return <div className="p-8"><LoadingState message="Fetching your reimbursement data..." /></div>;
  if (status === 'error') return <div className="p-8"><ErrorState error={error} onRetry={load} /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Panel */}
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 rounded-3xl p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-widest text-blue-200">
                Financial Tracking
             </div>
             <h1 className="text-4xl font-black tracking-tight">Reimbursement Claims</h1>
             <p className="text-blue-100 text-lg font-medium max-w-xl">Create, track, and manage your official reimbursement requests in one place.</p>
          </div>
          {canCreate && (
            <button
              onClick={() => navigate('/employee/reimbursements/new')}
              className="px-10 py-4 bg-white text-blue-700 font-black rounded-2xl hover:bg-blue-50 transition-all active:scale-95 shadow-2xl"
            >
              Start New Claim
            </button>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-wrap items-center gap-6">
        <div className="flex-1 min-w-[240px]">
           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Specific Month</label>
           <input
              type="month"
              value={month}
              onChange={(e) => { setMonth(e.target.value); setPage(1); }}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
            />
        </div>
        <div className="flex-1 min-w-[240px]">
           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Request Status</label>
           <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
            >
              <option value="">All Workflow States</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="PAID">PAID</option>
              <option value="CLOSED">CLOSED</option>
            </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {items.length === 0 ? (
          <div className="py-24 text-center">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <span className="text-4xl">📄</span>
             </div>
             <h3 className="text-xl font-bold text-slate-900">No active claims</h3>
             <p className="text-slate-500 font-medium mt-1">Adjust your filters or create a new reimbursement request.</p>
          </div>
        ) : (
          <>
            <ReimbursementTable
              rows={items}
              loading={false}
              empty="No matching claims"
              onRowClick={(r) => navigate(`/employee/reimbursements/${r.id}`)}
            />
            
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Page {page} of {totalPages} • Total Results: {total}
              </div>
              <div className="flex gap-3">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-5 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-xs font-black uppercase tracking-widest hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 transition-all"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-5 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-xs font-black uppercase tracking-widest hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 transition-all"
                >
                  Next Page
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
