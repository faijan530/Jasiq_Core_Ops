import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { incomeService } from '../../../services/incomeService.js';
import { ErrorState, ForbiddenState, LoadingState, EmptyState } from '../../../components/States.jsx';

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  const style =
    s === 'SUBMITTED'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : s === 'REJECTED'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}>{s}</span>
  );
}

export function FinanceRevenueApprovalPage() {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [actionStatus, setActionStatus] = useState('idle');
  const [actionError, setActionError] = useState(null);

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await incomeService.listIncome({ page: 1, size: 50, status: 'SUBMITTED' });
      setData(payload);
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);

  if (status === 'loading') return <LoadingState message="Loading approvals…" />;

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'INCOME_APPROVE' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  async function approve(id) {
    try {
      setActionStatus('loading');
      setActionError(null);
      await incomeService.approveIncome(id);
      setActionStatus('idle');
      await load();
    } catch (err) {
      setActionError(err);
      setActionStatus('idle');
    }
  }

  async function reject() {
    if (!rejectTarget) return;
    try {
      setActionStatus('loading');
      setActionError(null);
      await incomeService.rejectIncome(rejectTarget, rejectReason);
      setActionStatus('idle');
      setRejectOpen(false);
      setRejectReason('');
      setRejectTarget(null);
      await load();
    } catch (err) {
      setActionError(err);
      setActionStatus('idle');
    }
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Revenue Approvals</h2>
            <p className="text-sm text-slate-500 mt-1">Review submitted incomes.</p>
          </div>
          <Link
            to="/finance/revenue"
            className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
          >
            Back
          </Link>
        </div>

        {actionError ? <div className="mt-4 text-sm text-rose-700">{String(actionError.message || actionError)}</div> : null}

        {items.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No approvals" description="No submitted income entries found." />
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Title</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 text-sm text-slate-700">{String(r.incomeDate || '').slice(0, 10)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{r.clientName || r.clientId || '—'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.title}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">₹{Number(r.amount || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        disabled={actionStatus === 'loading'}
                        onClick={() => approve(r.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        disabled={actionStatus === 'loading'}
                        onClick={() => {
                          setRejectTarget(r.id);
                          setRejectOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {rejectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setRejectOpen(false)} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-900">Reject Income</div>
                  <div className="text-sm text-slate-500 mt-1">Provide a reason (UI only).</div>
                </div>
                <button onClick={() => setRejectOpen(false)} className="p-2 rounded-xl hover:bg-slate-100">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-5">
                <label className="block text-xs font-semibold text-slate-600">Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Reason for rejection"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setRejectOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  disabled={actionStatus === 'loading'}
                  onClick={reject}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold shadow hover:bg-rose-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
