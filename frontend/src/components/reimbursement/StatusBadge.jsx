import React from 'react';

const MAP = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SUBMITTED: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
  REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
  PAID: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CLOSED: 'bg-emerald-200 text-emerald-900 border-emerald-300'
};

export function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase() || '—';
  const cls = MAP[s] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {s}
    </span>
  );
}
