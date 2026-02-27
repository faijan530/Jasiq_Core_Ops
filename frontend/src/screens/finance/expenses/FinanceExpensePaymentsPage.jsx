import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch } from '../../../api/client.js';
import { ErrorState, ForbiddenState, LoadingState, EmptyState } from '../../../components/States.jsx';

function fmtMoney(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function FinanceExpensePaymentsPage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('size', String(pageSize));
    p.set('status', 'APPROVED');
    return p.toString();
  }, [page]);

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

  if (status === 'loading') return <LoadingState message="Loading payment queue…" />;

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'EXPENSE_READ' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Expense Payments</h1>
        <p className="text-slate-600 mt-1">Approved expenses awaiting payment or partial settlement.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No items" description="No approved expenses found." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expense</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Division</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{r.title || r.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{r.divisionId || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{fmtMoney(r.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => navigate(`/finance/expenses/${r.id}`)}
                        className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50"
                      >
                        Quick mark paid
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
