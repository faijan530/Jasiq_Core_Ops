import React, { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { ErrorState, ForbiddenState, LoadingState, EmptyState } from '../../components/States.jsx';

function fmtMoney(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function downloadCsv(filename, rows) {
  const lines = rows.map((r) =>
    r
      .map((v) => {
        const s = String(v ?? '');
        const escaped = s.replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(',')
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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

export function FinanceLedgerPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [month, setMonth] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set('page', String(page));
    qs.set('pageSize', String(pageSize));
    if (month) qs.set('month', month);
    if (type) qs.set('type', type);
    if (search) qs.set('search', search);
    return qs.toString();
  }, [month, type, search, page]);

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await apiFetch(`/api/v1/finance/ledger?${queryString}`);
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
  }, [queryString]);

  useEffect(() => {
    function onRefresh() {
      load();
    }
    window.addEventListener('finance:refresh', onRefresh);
    return () => window.removeEventListener('finance:refresh', onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const total = useMemo(() => Number(data?.total || 0), [data]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const pageTotals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const r of items) {
      debit += Number(r?.debit || 0) || 0;
      credit += Number(r?.credit || 0) || 0;
    }
    return { debit, credit, net: credit - debit };
  }, [items]);

  if (status === 'loading') return <LoadingState message="Loading ledger…" />;

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'FINANCE_LEDGER_READ' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ledger</h1>
          <p className="text-slate-600 mt-1">Payroll-derived entries with running balance.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-sm font-semibold text-slate-800">Filters</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMonth('');
                setType('');
                setSearch('');
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              onClick={() => {
                const rows = [
                  ['date', 'type', 'reference', 'employeeName', 'divisionName', 'debit', 'credit', 'balance'],
                  ...items.map((r) => [r.date, r.type, r.reference, r.employeeName, r.divisionName, r.debit, r.credit, r.balance])
                ];
                downloadCsv(`finance-ledger-page-${page}.csv`, rows);
              }}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Month</label>
            <input
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
              placeholder="YYYY-MM"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              <option value="">All</option>
              <option value="PAYROLL">PAYROLL</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
              <option value="BONUS">BONUS</option>
              <option value="PAYMENT">PAYMENT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Employee Search</label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by employee name"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Page Debit</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{fmtMoney(pageTotals.debit)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Page Credit</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{fmtMoney(pageTotals.credit)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Page Net</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{fmtMoney(pageTotals.net)}</div>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No ledger entries" description="No entries matched your filters." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Division</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Debit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Credit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{fmtDate(r.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{String(r.type || '—')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{String(r.reference || '—')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{String(r.employeeName || '—')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{String(r.divisionName || '—')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{fmtMoney(r.debit)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{fmtMoney(r.credit)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold text-right">{fmtMoney(r.balance)}</td>
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
