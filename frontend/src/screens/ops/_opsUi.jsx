import React, { useMemo } from 'react';

import { EmptyState, ErrorState, LoadingState, ForbiddenState } from '../../components/States.jsx';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function OpsPageShell({ title, subtitle, loading, error, empty, forbidden, children, onRetry }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle ? <div className="text-sm text-slate-600 mt-1">{subtitle}</div> : null}
          </div>
        </div>
      </div>

      {forbidden ? <ForbiddenState /> : null}
      {!forbidden && loading ? <LoadingState /> : null}
      {!forbidden && !loading && error ? <ErrorState error={error} onRetry={onRetry} /> : null}
      {!forbidden && !loading && !error && empty ? (
        <EmptyState title={empty.title} description={empty.description} action={empty.action} />
      ) : null}
      {!forbidden && !loading && !error && !empty ? children : null}
    </div>
  );
}

export function Badge({ tone = 'slate', children }) {
  const styles = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  return (
    <span className={cx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border', styles[tone] || styles.slate)}>
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const s = String(severity || '').toUpperCase();
  const tone = s === 'CRITICAL' ? 'red' : s === 'HIGH' ? 'amber' : s === 'MEDIUM' ? 'blue' : 'slate';
  return <Badge tone={tone}>{s || '—'}</Badge>;
}

export function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  const tone = s === 'OPEN' || s === 'REQUESTED' ? 'amber' : s === 'ACKNOWLEDGED' || s === 'APPROVED' ? 'blue' : s === 'RESOLVED' || s === 'EXECUTED' ? 'green' : 'slate';
  return <Badge tone={tone}>{s || '—'}</Badge>;
}

export function Button({ children, variant = 'secondary', disabled, onClick, type = 'button' }) {
  const base = 'inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border transition-colors';
  const styles = {
    primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
    secondary: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
    danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant] || styles.secondary} ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-inherit' : ''}`}
    >
      {children}
    </button>
  );
}

export function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
      <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-2">{value}</div>
      {hint ? <div className="text-xs text-slate-600 mt-2">{hint}</div> : null}
    </div>
  );
}

export function TableShell({ columns, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cx(
                  'px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200',
                  c.align === 'right' ? 'text-right' : ''
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Drawer({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-200 shadow-xl">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 overflow-auto h-full pb-24">{children}</div>
      </div>
    </div>
  );
}

export function ModalFrame({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function useSlaHelpers(rows) {
  return useMemo(() => {
    const now = Date.now();
    const isOverdue = (slaDueAt, status) => {
      if (!slaDueAt) return false;
      const s = String(status || '').toUpperCase();
      if (s === 'RESOLVED' || s === 'EXECUTED') return false;
      const t = new Date(slaDueAt).getTime();
      if (Number.isNaN(t)) return false;
      return t < now;
    };

    const overdueCount = (rows || []).filter((r) => isOverdue(r.slaDueAt, r.status)).length;

    return { isOverdue, overdueCount };
  }, [rows]);
}
