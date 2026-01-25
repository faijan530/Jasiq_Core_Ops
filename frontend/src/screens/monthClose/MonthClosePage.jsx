import React, { useState, useMemo } from 'react';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

function toMonthEndIso(date) {
  const d = date instanceof Date ? date : new Date(date);
  const utcEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return utcEnd.toISOString().slice(0, 10);
}

function toMonthInputValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 7);
}

function getMonthEndForRow(row) {
  return toMonthEndIso(row?.monthEnd || row?.monthStart || row?.month);
}

export function MonthClosePage() {
  const { bootstrap } = useBootstrap();
  const title = bootstrap?.ui?.screens?.monthClose?.title || 'Month Close';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [month, setMonth] = useState(toMonthInputValue(new Date()));
  const [status, setStatus] = useState('CLOSED');
  const [reason, setReason] = useState('');
  const [lastSaved, setLastSaved] = useState(null);

  const list = usePagedQuery({ path: '/api/v1/governance/month-close', page, pageSize, enabled: true });

  const setStatusMutation = useMutation(async () => {
    const trimmedReason = reason.trim();
    const monthEnd = toMonthEndIso(`${month}-01`);
    return apiFetch('/api/v1/governance/month-close/status', {
      method: 'POST',
      body: { month: monthEnd, status, reason: trimmedReason || null }
    });
  });

  const items = list.data?.items || [];
  const total = list.data?.total || 0;

  const reasonRequired = status === 'OPEN' || status === 'CLOSED';
  const hasValidReason = reason.trim().length > 0;

  const canSubmit = Boolean(month) && Boolean(status) && hasValidReason;

  const latestByMonth = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const key = getMonthEndForRow(item);
      if (!map.has(key)) map.set(key, item);
    }
    return Array.from(map.values()).sort((a, b) => {
      const am = getMonthEndForRow(a);
      const bm = getMonthEndForRow(b);
      return new Date(bm) - new Date(am);
    });
  }, [items]);

  const handleApply = async () => {
    try {
      const result = await setStatusMutation.run();
      setLastSaved(result);
      setReason('');
      await list.refetch();
    } catch {}
  };

  if (list.status === 'loading' && !list.data) {
    return (
      <div>
        <PageHeader title={title} />
        <LoadingState />
      </div>
    );
  }

  if (list.status === 'error') {
    if (list.error?.status === 403) {
      return (
        <div>
          <PageHeader title={title} />
          <ForbiddenState />
        </div>
      );
    }

    return (
      <div>
        <PageHeader title={title} />
        <ErrorState error={list.error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title={title} />

      {/* Warning Banner */}
      <div className="mx-4 mt-4 mb-2 md:mx-6 lg:mx-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Month Close is a critical governance action</p>
            <p className="text-xs text-amber-700 mt-1">Each action is recorded. Ensure the reason is clear and accurate.</p>
          </div>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="mx-4 mb-4 md:mx-6 lg:mx-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Months</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{latestByMonth.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Closed</div>
            <div className="text-2xl font-bold text-green-700 mt-1">
              {latestByMonth.filter(m => m.status === 'CLOSED').length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Open</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {latestByMonth.filter(m => m.status === 'OPEN').length}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Card */}
      <div className="mx-4 mb-6 md:mx-6 lg:mx-8">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm sticky top-4 z-10">
          <div className="text-sm font-semibold text-slate-900 mb-3">Apply Month Close Status</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Month</label>
              <input
                type="month"
                className="mt-1 w-full rounded-md border-slate-300 text-sm"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Status</label>
              <select
                className="mt-1 w-full rounded-md border-slate-300 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Reason</label>
              <input
                className={`mt-1 w-full rounded-md border-slate-300 text-sm ${reasonRequired && !hasValidReason ? 'border-rose-500' : ''}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonRequired ? 'Required' : 'Optional'}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="w-full md:w-auto px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium disabled:bg-slate-400 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                disabled={!canSubmit || setStatusMutation.status === 'loading'}
                onClick={handleApply}
              >
                {setStatusMutation.status === 'loading' ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </div>
          {setStatusMutation.status === 'error' ? <div className="mt-3"><ErrorState error={setStatusMutation.error} /></div> : null}
          {lastSaved ? (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="text-sm font-medium text-green-800">Saved</div>
              <div className="text-xs text-green-700 mt-1">
                {getMonthEndForRow(lastSaved)} → {lastSaved.status}
                {lastSaved.closedReason ? ` | ${lastSaved.closedReason}` : ''}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* History Table */}
      <div className="mx-4 mb-6 md:mx-6 lg:mx-8">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">History</h2>
          </div>
          {items.length === 0 ? (
            <div className="p-8">
              <EmptyState title="No month close entries" description="Set a month status above." />
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {items.map((m) => (
                  <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-slate-500">Month</div>
                        <div className="mt-1 font-mono text-sm text-slate-900">{String(getMonthEndForRow(m)).slice(0, 10)}</div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${m.status === 'CLOSED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {m.status}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <div>
                        <div className="text-xs font-medium text-slate-500">Reason</div>
                        <div className="mt-1 text-sm text-slate-900">{m.closedReason || '-'}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs font-medium text-slate-500">Closed At</div>
                          <div className="mt-1 text-xs text-slate-700">{m.closedAt ? String(m.closedAt) : '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-500">Closed By</div>
                          <div className="mt-1 font-mono text-xs text-slate-700">{m.closedBy || '-'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table
                  columns={[
                    { key: 'month', header: 'Month', render: (d) => <span className="font-mono text-sm">{String(getMonthEndForRow(d)).slice(0, 10)}</span> },
                    { key: 'status', header: 'Status', render: (d) => (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${d.status === 'CLOSED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {d.status}
                      </span>
                    )},
                    { key: 'closedAt', header: 'Closed At', render: (d) => (d.closedAt ? String(d.closedAt) : '-') },
                    { key: 'closedBy', header: 'Closed By', render: (d) => (d.closedBy ? <span className="font-mono text-xs">{d.closedBy}</span> : '-') },
                    { key: 'reason', header: 'Reason', render: (d) => d.closedReason || '-' }
                  ]}
                  rows={items.map((m) => ({ key: m.id, data: m }))}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="mx-4 mb-8 md:mx-6 lg:mx-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            className="w-full sm:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <div className="text-sm text-slate-600">Page {page} / Total {total}</div>
          <button
            type="button"
            className="w-full sm:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
