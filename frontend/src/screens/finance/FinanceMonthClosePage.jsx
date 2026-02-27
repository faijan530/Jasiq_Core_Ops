import React, { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { ErrorState, ForbiddenState, LoadingState, EmptyState } from '../../components/States.jsx';

function fmtMonth(m) {
  if (!m) return '—';
  try {
    const d = new Date(m);
    if (!Number.isFinite(d.getTime())) return String(m);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  } catch {
    return String(m);
  }
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (!Number.isFinite(dt.getTime())) return String(d);
    return dt.toLocaleString();
  } catch {
    return String(d);
  }
}

export function FinanceMonthClosePage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [closeMonth, setCloseMonth] = useState(null);
  const [reason, setReason] = useState('');
  const [actionStatus, setActionStatus] = useState('idle');
  const [actionError, setActionError] = useState(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('pageSize', String(pageSize));
    return p.toString();
  }, [page]);

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await apiFetch(`/api/v1/governance/month-close?${qs}`);
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

  const statusCounts = useMemo(() => {
    let open = 0;
    let closed = 0;
    for (const r of items) {
      const s = String(r?.status || 'OPEN');
      if (s === 'CLOSED') closed += 1;
      else open += 1;
    }
    return { open, closed };
  }, [items]);

  if (status === 'loading') return <LoadingState message="Loading month close…" />;

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'GOV_MONTH_CLOSE_READ' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  async function doClose() {
    try {
      setActionStatus('loading');
      setActionError(null);
      const m = String(closeMonth || '').trim();
      await apiFetch(`/api/v1/governance/month-close/close`, {
        method: 'POST',
        body: { month: m, reason }
      });
      setActionStatus('idle');
      setModalOpen(false);
      setReason('');
      setCloseMonth(null);
      window.dispatchEvent(new Event('finance:refresh'));
      await load();
    } catch (err) {
      setActionError(err);
      setActionStatus('idle');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Month Close</h1>
        <p className="text-slate-600 mt-1">Close accounting months with an audit reason.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Shown (this page)</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{items.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Open</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{statusCounts.open}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Closed</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{statusCounts.closed}</div>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No month close records" description="No month close activity found." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Scope</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Closed By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Closed At</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {items.map((r, idx) => {
                  const m = fmtMonth(r.month);
                  const key = r.id || `${m}-${idx}`;
                  const statusLabel = String(r.status || 'OPEN');
                  const canClose = statusLabel === 'OPEN';
                  return (
                    <tr key={key} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{m}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{String(r.scope || 'COMPANY')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {statusLabel === 'CLOSED' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            CLOSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            OPEN
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{r?.closedBy?.id ? String(r.closedBy.id) : '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{fmtDate(r.closedAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {canClose ? (
                          <button
                            onClick={() => {
                              setCloseMonth(m);
                              setReason('');
                              setActionError(null);
                              setModalOpen(true);
                            }}
                            className="px-3 py-2 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white text-sm font-medium"
                          >
                            Close Month
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="text-lg font-bold text-slate-900">Close Month</div>
              <div className="text-sm text-slate-600 mt-1">Month: {String(closeMonth || '—')}</div>
            </div>
            <div className="p-6 space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Reason (required)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full min-h-[90px] px-3 py-2 rounded-lg border border-slate-200 text-sm"
                placeholder="Enter reason for closing this month"
              />
              {actionError?.status === 403 && (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  Required permission: <span className="font-semibold">MONTH_CLOSE_EXECUTE</span>
                </div>
              )}
              {actionError && actionError?.status !== 403 && (
                <div className="text-sm text-rose-600">{actionError?.message || 'Failed to close month'}</div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                disabled={actionStatus === 'loading'}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
              >
                Cancel
              </button>
              <button
                disabled={actionStatus === 'loading' || !String(reason || '').trim()}
                onClick={doClose}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {actionStatus === 'loading' ? 'Closing…' : 'Close Month'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
