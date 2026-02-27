import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch } from '../../../api/client.js';
import { ErrorState, ForbiddenState, LoadingState, EmptyState } from '../../../components/States.jsx';

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
  if (v === 'DRAFT') return 'gray';
  if (v === 'SUBMITTED') return 'blue';
  if (v === 'APPROVED') return 'teal';
  if (v === 'REJECTED') return 'red';
  if (v === 'PAID') return 'green';
  if (v === 'CLOSED') return 'gray';
  if (v === 'PARTIAL') return 'yellow';
  return 'gray';
}

export function FinanceExpensesPage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [filtersOpen, setFiltersOpen] = useState(true);

  const [scope, setScope] = useState('');
  const [source, setSource] = useState('');
  const [approvalState, setApprovalState] = useState('');
  const [paymentState, setPaymentState] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [categories, setCategories] = useState([]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('size', String(pageSize));

    if (approvalState) p.set('status', approvalState);
    if (divisionId) p.set('divisionId', divisionId);
    if (categoryId) p.set('categoryId', categoryId);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (minAmount) p.set('minAmount', minAmount);
    if (maxAmount) p.set('maxAmount', maxAmount);
    if (search) p.set('search', search);

    return p.toString();
  }, [page, approvalState, divisionId, categoryId, from, to, minAmount, maxAmount, search]);

  async function load() {
    try {
      setStatus('loading');
      setError(null);

      const [payload, cats] = await Promise.all([
        apiFetch(`/api/v1/expenses?${qs}`),
        apiFetch('/api/v1/expenses/categories')
      ]);

      setData(payload);
      setCategories(Array.isArray(cats?.items) ? cats.items : Array.isArray(cats) ? cats : []);
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

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'EXPENSE_READ' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  function reset() {
    setScope('');
    setSource('');
    setApprovalState('');
    setPaymentState('');
    setDivisionId('');
    setCategoryId('');
    setFrom('');
    setTo('');
    setMinAmount('');
    setMaxAmount('');
    setSearch('');
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-600 mt-1">Capture, approve and pay expenses with audit trail.</p>
        </div>
        <button
          onClick={() => navigate('/finance/expenses/create')}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium"
        >
          Create Expense
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="text-sm font-semibold text-slate-800 hover:text-slate-900"
          >
            Filters
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              onClick={load}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {filtersOpen ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Scope</label>
              <select value={scope} onChange={(e) => setScope(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                <option value="">All</option>
                <option value="COMPANY">COMPANY</option>
                <option value="DIVISION">DIVISION</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                <option value="">All</option>
                <option value="VENDOR">VENDOR</option>
                <option value="REIMBURSEMENT">REIMBURSEMENT</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Approval State</label>
              <select
                value={approvalState}
                onChange={(e) => {
                  setApprovalState(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="">All</option>
                <option value="DRAFT">DRAFT</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="PAID">PAID</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment State</label>
              <select value={paymentState} onChange={(e) => setPaymentState(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                <option value="">All</option>
                <option value="UNPAID">UNPAID</option>
                <option value="PARTIAL">PARTIAL</option>
                <option value="PAID">PAID</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Division</label>
              <input
                value={divisionId}
                onChange={(e) => {
                  setDivisionId(e.target.value);
                  setPage(1);
                }}
                placeholder="Division UUID"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Min Amount</label>
              <input
                value={minAmount}
                onChange={(e) => {
                  setMinAmount(e.target.value);
                  setPage(1);
                }}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Max Amount</label>
              <input
                value={maxAmount}
                onChange={(e) => {
                  setMaxAmount(e.target.value);
                  setPage(1);
                }}
                placeholder="100000"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Search (title/vendor)</label>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search…"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState title="No expenses" description="No expenses matched your filters." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Scope</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Division</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Approval</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {items.map((r) => {
                  const approval = String(r.status || '—').toUpperCase();
                  const payment = approval === 'PAID' ? 'PAID' : approval === 'APPROVED' ? 'UNPAID' : approval === 'CLOSED' ? 'PAID' : '—';
                  const cat = categories.find((c) => String(c.id) === String(r.categoryId));

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{fmtDate(r.expenseDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">—</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{r.divisionId ? String(r.divisionId).slice(0, 8) + '…' : '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{r.isReimbursement ? 'REIMBURSEMENT' : 'VENDOR'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{cat ? `${cat.code}` : String(r.categoryId || '—').slice(0, 8) + '…'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{fmtMoney(r.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        <Badge tone={statusTone(approval)}>{approval}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        <Badge tone={statusTone(payment)}>{payment}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                        <button
                          onClick={() => navigate(`/finance/expenses/${r.id}`)}
                          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              Page {page} of {totalPages} (Total: {total})
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
