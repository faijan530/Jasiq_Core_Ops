import React, { useMemo, useState } from 'react';

const METHODS = ['BANK_TRANSFER', 'UPI', 'CASH', 'OTHER'];

export function PaymentModal({ open, onClose, onSubmit, maxAmount }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [referenceId, setReferenceId] = useState('');
  const [note, setNote] = useState('');

  const canSubmit = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return false;
    if (maxAmount !== undefined && maxAmount !== null) {
      const m = Number(maxAmount);
      if (Number.isFinite(m) && n > m) return false;
    }
    return true;
  }, [amount, maxAmount]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Add Payment</h3>
            <button onClick={onClose} className="text-slate-600 hover:text-slate-900">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Reference ID</label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Note</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200">
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => onSubmit && onSubmit({ amount: Number(amount), method, referenceId: referenceId || null, note: note || null })}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              !canSubmit
                ? 'bg-slate-200 text-slate-500'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700'
            }`}
          >
            Add Payment
          </button>
        </div>
      </div>
    </div>
  );
}
