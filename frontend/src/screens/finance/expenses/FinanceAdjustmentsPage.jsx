import React, { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../../../api/client.js';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../../components/States.jsx';

function fmtMoney(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function FinanceAdjustmentsPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [adjustmentDate, setAdjustmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [targetMonth, setTargetMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [targetType, setTargetType] = useState('EXPENSE');
  const [direction, setDirection] = useState('INCREASE');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const total = useMemo(() => Number(data?.total || 0), [data]);

  const canSubmit =
    Boolean(String(reason || '').trim()) &&
    Boolean(String(adjustmentDate || '').trim()) &&
    Boolean(String(targetMonth || '').trim()) &&
    Boolean(String(targetType || '').trim()) &&
    Boolean(String(direction || '').trim()) &&
    Number.isFinite(Number(amount)) &&
    Number(amount) !== 0;

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const qs = new URLSearchParams();
      if (targetMonth) qs.set('targetMonth', targetMonth);
      const payload = await apiFetch(`/api/v1/governance/month-close/adjustments?${qs.toString()}`);
      setData(payload);
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMonth]);

  async function create() {
    try {
      setSaving(true);
      setSaveError(null);
      if (!canSubmit) throw new Error('Please fill required fields');

      await apiFetch('/api/v1/governance/month-close/adjustments', {
        method: 'POST',
        body: {
          adjustmentDate,
          targetMonth,
          targetType,
          direction,
          amount: Number(amount),
          reason: String(reason).trim()
        }
      });

      setAmount('');
      setReason('');
      await load();
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') return <LoadingState message="Loading adjustments…" />;

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'ADJUSTMENT_VIEW' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Adjustments</h1>
        <p className="text-slate-600 mt-1">Append-only adjustments with audit reason.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="text-sm font-semibold text-slate-800">Create adjustment</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Adjustment Date</label>
            <input type="date" value={adjustmentDate} onChange={(e) => setAdjustmentDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Target Month</label>
            <input value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="YYYY-MM" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Target Type</label>
            <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="EXPENSE">EXPENSE</option>
              <option value="INCOME">INCOME</option>
              <option value="PAYROLL">PAYROLL</option>
              <option value="SETTLEMENT">SETTLEMENT</option>
              <option value="REIMBURSEMENT">REIMBURSEMENT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Direction</label>
            <select value={direction} onChange={(e) => setDirection(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="INCREASE">INCREASE</option>
              <option value="DECREASE">DECREASE</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Reason</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Reason" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Amount</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="0" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end">
          <button
            disabled={!canSubmit || saving}
            onClick={create}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
        {saveError?.status === 403 ? (
          <div className="mt-3 text-xs text-rose-700">Required permission: ADJUSTMENT_CREATE</div>
        ) : saveError ? (
          <div className="mt-3 text-xs text-rose-700">{String(saveError.message || saveError)}</div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState title="No adjustments" description={targetMonth ? `No adjustments found for ${targetMonth}.` : 'No adjustments found.'} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Adjustments</div>
            <div className="text-xs text-slate-500">Total: {total}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Target Month</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Direction</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">{String(r.adjustmentDate || r.adjustment_date || '').slice(0, 10) || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{String(r.targetMonth || r.target_month || '').slice(0, 7) || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{String(r.targetType || r.target_type || '—')}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{String(r.direction || '—')}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">{fmtMoney(r.amount)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{String(r.reason || '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
