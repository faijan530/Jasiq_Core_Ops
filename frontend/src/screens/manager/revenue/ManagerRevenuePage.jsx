import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { incomeService } from '../../../services/incomeService.js';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../../components/States.jsx';

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  const style =
    s === 'SUBMITTED'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : s === 'APPROVED'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}>{s}</span>
  );
}

export function ManagerRevenuePage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await incomeService.listIncome({ page: 1, size: 50 });
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

  const rows = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);

  if (status === 'loading') return <LoadingState message="Loading revenue…" />;

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'INCOME_READ' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Revenue</h2>
            <p className="text-sm text-slate-500 mt-1">Create and track income (UI only).</p>
          </div>
          <Link
            to="/manager/revenue/create"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold shadow hover:from-blue-700 hover:to-indigo-800 transition"
          >
            Create Income
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No income" description="No income entries found." />
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
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 text-sm text-slate-700">{String(r.incomeDate || '').slice(0, 10)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{r.clientName || r.clientId || '—'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.title}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/manager/revenue/${r.id}`} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-50">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
