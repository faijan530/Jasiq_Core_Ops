import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { incomeService } from '../../../services/incomeService.js';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../../components/States.jsx';

function currency(n) {
  const v = Number(n || 0);
  return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
}

export function FinanceRevenuePaymentsPage() {
  const { id } = useParams();
  const [open, setOpen] = useState(false);

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const [actionStatus, setActionStatus] = useState('idle');
  const [actionError, setActionError] = useState(null);

  const [paidAmount, setPaidAmount] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [referenceId, setReferenceId] = useState('');

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await incomeService.listPayments(id);
      setRows(Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : []);
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (status === 'loading') return <LoadingState message="Loading payments…" />;

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'INCOME_READ' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  async function addPayment() {
    try {
      setActionStatus('loading');
      setActionError(null);

      await incomeService.markPaid(id, {
        paidAmount: Number(paidAmount),
        paidAt: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
        method,
        referenceId: referenceId || null
      });

      setActionStatus('idle');
      setOpen(false);
      setPaidAmount('');
      setPaidAt('');
      setMethod('BANK_TRANSFER');
      setReferenceId('');
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
            <h2 className="text-xl font-bold text-slate-900">Payments</h2>
            <p className="text-sm text-slate-500 mt-1">Income ID: {id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/finance/revenue/${id}`}
              className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              Back
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold shadow hover:from-blue-700 hover:to-indigo-800 transition"
            >
              Add Payment
            </button>
          </div>
        </div>

        {actionError ? <div className="mt-4 text-sm text-rose-700">{String(actionError.message || actionError)}</div> : null}

        {rows.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No payments" description="No payments recorded yet." />
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Paid At</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Method</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Reference</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 text-sm text-slate-700">{String(r.paidAt || r.paid_at || '').replace('T', ' ').slice(0, 16)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{r.method}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{r.referenceId || '—'}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">{currency(r.paidAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-900">Add Payment</div>
                  <div className="text-sm text-slate-500 mt-1">Record payment</div>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-slate-100">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Paid Amount</label>
                  <input
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Paid At</label>
                  <input
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    type="datetime-local"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">CASH</option>
                    <option value="CARD">CARD</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Reference ID</label>
                  <input
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="UTR/Ref"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  disabled={actionStatus === 'loading'}
                  onClick={addPayment}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold shadow disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
