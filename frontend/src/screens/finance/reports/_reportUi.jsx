import React from 'react';

import { LoadingState, EmptyState, ForbiddenState } from '../../../components/States.jsx';

export function canAccessFinanceReports(roles) {
  const r = Array.isArray(roles) ? roles : [];
  return r.includes('SUPER_ADMIN') || r.includes('FINANCE_ADMIN') || r.includes('FINANCE_HEAD');
}

export function canAccessPnlOnly(roles) {
  const r = Array.isArray(roles) ? roles : [];
  if (r.includes('SUPER_ADMIN') || r.includes('FINANCE_ADMIN') || r.includes('FINANCE_HEAD')) return true;
  if (r.includes('MANAGER')) return true;
  return false;
}

export function ReportPageShell({
  title,
  subtitle,
  filter,
  status,
  canAccess,
  emptyTitle,
  emptyDescription,
  children
}) {
  if (!canAccess) {
    return (
      <div className="p-6">
        <ForbiddenState error={{ message: 'Access denied' }} />
      </div>
    );
  }

  if (status === 'forbidden') {
    return (
      <div className="p-6">
        <ForbiddenState error={{ message: 'Access denied' }} />
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="p-6">
        <LoadingState message={`Loading ${title}…`} />
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className="p-6">
        <EmptyState
          title={emptyTitle || `No ${title}`}
          description={emptyDescription || 'No data available for the selected filters.'}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle ? <p className="text-slate-600 mt-1">{subtitle}</p> : null}
        </div>
      </div>

      {filter ? <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">{filter}</div> : null}

      {children}
    </div>
  );
}

export function SimpleRangeFilter({ range, onChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">From</label>
        <input
          type="date"
          value={range.from}
          onChange={(e) => onChange({ ...range, from: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">To</label>
        <input
          type="date"
          value={range.to}
          onChange={(e) => onChange({ ...range, to: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
        />
      </div>
      <div className="flex items-end">
        <button
          type="button"
          onClick={() => onChange({ ...range })}
          className="w-full px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}

export function TableShell({ title, subtitle, columns, rows, rowKey }) {
  const items = Array.isArray(rows) ? rows : [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="text-xs text-slate-500 mt-1">{subtitle}</div> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {(columns || []).map((c) => (
                <th
                  key={c.key}
                  className={
                    'px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider ' +
                    (c.align === 'right' ? 'text-right' : 'text-left')
                  }
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {items.map((r, idx) => (
              <tr key={rowKey ? rowKey(r) : idx} className="hover:bg-slate-50">
                {(columns || []).map((c) => (
                  <td
                    key={c.key}
                    className={
                      'px-6 py-4 whitespace-nowrap text-sm ' +
                      (c.align === 'right' ? 'text-right text-slate-900 font-semibold' : 'text-left text-slate-700')
                    }
                  >
                    {c.render ? c.render(r) : String(r?.[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function fmtMoney(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
