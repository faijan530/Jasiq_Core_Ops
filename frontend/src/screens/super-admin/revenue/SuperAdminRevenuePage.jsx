import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { incomeService } from '../../../services/incomeService.js';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../../components/States.jsx';

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  const style =
    s === 'PAID'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : s === 'APPROVED'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : s === 'SUBMITTED'
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : s === 'REJECTED'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}>{s}</span>
  );
}

function currency(n) {
  const v = Number(n || 0);
  return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
}

export function SuperAdminRevenuePage() {
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
            <p className="text-sm text-slate-500 mt-1">View organization revenue (UI only).</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/super-admin/reports"
              className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              Reports
            </Link>
            <Link
              to="/super-admin/revenue/categories"
              className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              Categories
            </Link>
            <Link
              to="/super-admin/revenue/clients"
              className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              Clients
            </Link>
          </div>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Division</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Title</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Paid / Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((r) => {
                const amt = Number(r.amount || 0);
                const st = String(r.status || '').toUpperCase();
                const paid = st === 'PAID' ? amt : 0;
                const due = Math.max(0, amt - paid);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 text-sm text-slate-700">{String(r.incomeDate || '').slice(0, 10)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.divisionId}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.categoryName || r.categoryId}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.clientName || r.clientId || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.title}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="font-semibold text-slate-900">{currency(paid)}</div>
                      <div className="text-xs text-slate-500">Due: {currency(due)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="#"
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 transition"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
