import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch } from '../../../api/client.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/States.jsx';
import { useBootstrap } from '../../../state/bootstrap.jsx';

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
  if (v === 'DRAFT') return 'gray';
  if (v === 'SUBMITTED') return 'blue';
  if (v === 'APPROVED') return 'teal';
  if (v === 'REJECTED') return 'red';
  if (v === 'PAID') return 'green';
  if (v === 'PARTIAL') return 'yellow';
  return 'gray';
}

export function EmployeeExpensesPage() {
  const navigate = useNavigate();
  const { bootstrap } = useBootstrap();

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [stateFilter, setStateFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const employeeId = bootstrap?.user?.employeeId || bootstrap?.user?.employee_id || null;

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('size', String(pageSize));
    if (stateFilter) p.set('status', stateFilter);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    // reimbursement only
    p.set('reimbursement', 'true');
    return p.toString();
  }, [page, stateFilter, from, to]);

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

  if (status === 'loading') return <LoadingState message="Loading expenses…" />;
  if (status === 'error') return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Reimbursements</h1>
          <p className="text-slate-600 mt-1">Submit reimbursement expenses for approval.</p>
        </div>
        <button
          onClick={() => navigate('/employee/expenses/create')}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium"
        >
          Create
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="text-sm font-semibold text-slate-800 mb-4">Filters</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
            <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="">All</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="PAID">PAID</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
        </div>
        <div className="text-xs text-slate-500 mt-3">Employee: {employeeId ? String(employeeId) : '—'}</div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No expenses" description="No reimbursements matched your filters." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{fmtDate(r.expenseDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{r.title || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      <Badge tone={statusTone(r.status)}>{String(r.status || '—')}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => navigate(`/employee/expenses/${r.id}`)}
                        className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50"
                      >
                        View
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
