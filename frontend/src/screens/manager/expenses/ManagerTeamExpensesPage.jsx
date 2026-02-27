import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch } from '../../../api/client.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/States.jsx';

function fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (!Number.isFinite(dt.getTime())) return String(d);
    return dt.toLocaleDateString();
  } catch {
    return String(d);
  }
}

function fmtMoney(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function Badge({ tone, children }) {
  const cls =
    tone === 'gray'
      ? 'bg-slate-100 text-slate-700 border-slate-200'
      : tone === 'blue'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : tone === 'teal'
          ? 'bg-teal-50 text-teal-700 border-teal-200'
          : tone === 'red'
            ? 'bg-red-50 text-red-700 border-red-200'
            : tone === 'yellow'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : tone === 'green'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-700 border-slate-200';

  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>{children}</span>;
}

function statusTone(s) {
  const v = String(s || '').toUpperCase();
  if (v === 'SUBMITTED') return 'blue';
  if (v === 'APPROVED') return 'teal';
  if (v === 'REJECTED') return 'red';
  return 'gray';
}

export function ManagerTeamExpensesPage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [divisionId, setDivisionId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('size', String(pageSize));
    p.set('status', 'SUBMITTED');
    if (divisionId) p.set('divisionId', divisionId);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (search) p.set('search', search);
    return p.toString();
  }, [page, divisionId, from, to, search]);

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await apiFetch(`/api/v1/expenses?${qs}`);
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
  }, [qs]);

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const total = useMemo(() => Number(data?.total || 0), [data]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  if (status === 'loading') return <LoadingState message="Loading team expenses…" />;
  if (status === 'error') return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Team Expense Approvals</h1>
        <p className="text-slate-600 mt-1">Review submitted division expenses.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="text-sm font-semibold text-slate-800 mb-4">Filters</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Division</label>
            <input value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setPage(1); }} placeholder="Division UUID" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date From</label>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date To</label>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Search</label>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search title/vendor" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No submitted expenses" description="No items matched your filters." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Scope</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {r.employeeName ? String(r.employeeName) : r.employeeId ? String(r.employeeId).slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {r.categoryName ? String(r.categoryName) : r.categoryId ? String(r.categoryId).slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{fmtMoney(r.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{r.divisionId ? 'DIVISION' : 'COMPANY'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      <Badge tone={statusTone(r.status)}>{String(r.status || '—')}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => navigate(`/manager/expenses/${r.id}/review`)}
                        className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              Page {page} of {totalPages} (Total: {total})
            </div>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm disabled:opacity-50">Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
