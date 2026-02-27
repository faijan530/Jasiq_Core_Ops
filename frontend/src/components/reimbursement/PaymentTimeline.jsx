import React, { useMemo } from 'react';

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

function dt(v) {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function PaymentTimeline({ payments }) {
  const rows = useMemo(() => payments || [], [payments]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
      <h3 className="text-sm font-bold text-slate-900">Payments</h3>

      {rows.length === 0 ? (
        <div className="mt-3 text-sm text-slate-600">No payments yet.</div>
      ) : (
        <div className="mt-3 space-y-3">
          {rows.map((p) => (
            <div key={p.id} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">{money(p.paidAmount)}</div>
                  <div className="text-xs text-slate-600">{dt(p.paidAt)}</div>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  <span className="font-medium">{p.method}</span>
                  {p.referenceId ? ` · Ref: ${p.referenceId}` : ''}
                </div>
                {p.note ? <div className="text-xs text-slate-600 mt-1">{p.note}</div> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
