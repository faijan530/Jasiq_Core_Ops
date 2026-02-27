import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

export function FinanceRevenuePage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [incomeStatus, setIncomeStatus] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [clientId, setClientId] = useState('');
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const pageSize = 20;

  async function load() {
    try {
      setStatus('loading');
      setError(null);

      const [payload, cats, clientPayload] = await Promise.all([
        incomeService.listIncome({
          page,
          size: pageSize,
          status: incomeStatus || undefined,
          divisionId: divisionId || undefined,
          categoryId: categoryId || undefined,
          clientId: clientId || undefined,
          from: from || undefined,
          to: to || undefined,
          search: search || undefined
        }),
        incomeService.listCategories(),
        incomeService.listClients({ page: 1, size: 200, active: true })
      ]);

      setData(payload);
      setCategories(Array.isArray(cats?.items) ? cats.items : Array.isArray(cats) ? cats : []);
      setClients(Array.isArray(clientPayload?.items) ? clientPayload.items : []);

      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, from, to, incomeStatus, divisionId, categoryId, clientId, search]);

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const total = useMemo(() => Number(data?.total || 0), [data]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

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
            <p className="text-sm text-slate-500 mt-1">Track income drafts, approvals, and payments.</p>
          </div>
          <Link
            to="/finance/revenue/create"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold shadow hover:from-blue-700 hover:to-indigo-800 transition"
          >
            Create Income
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-7 gap-3">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-600">From</label>
            <input
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-600">To</label>
            <input
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-600">Status</label>
            <select
              value={incomeStatus}
              onChange={(e) => {
                setIncomeStatus(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-600">Division</label>
            <input
              value={divisionId}
              onChange={(e) => {
                setDivisionId(e.target.value);
                setPage(1);
              }}
              placeholder="Division UUID"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-600">Category</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-600">Client</label>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-600">Search</label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Title / Invoice"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No income found"
              description="Try adjusting filters or create a new income entry."
              action={<button onClick={() => navigate('/finance/revenue/create')}>Create Income</button>}
            />
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
                {items.map((r) => {
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
                          to={`/finance/revenue/${r.id}`}
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

        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-slate-600">
            Showing <span className="font-semibold">{items.length}</span> of <span className="font-semibold">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">{page}</div>
            <button
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
