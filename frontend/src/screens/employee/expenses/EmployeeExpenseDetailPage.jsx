import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { apiFetch, getApiBaseUrl, getAuthToken } from '../../../api/client.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/States.jsx';

function fmtMoney(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
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

async function downloadBlob({ path, filename }) {
  const base = getApiBaseUrl();
  const token = getAuthToken();

  const res = await fetch(`${base}${path}`, {
    method: 'GET',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {})
    }
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Download failed (${res.status})`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function EmployeeExpenseDetailPage() {
  const { expenseId } = useParams();

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const [expense, setExpense] = useState(null);
  const [receipts, setReceipts] = useState([]);

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const [detail, receiptPayload] = await Promise.all([
        apiFetch(`/api/v1/expenses/${expenseId}`),
        apiFetch(`/api/v1/expenses/${expenseId}/receipts`)
      ]);
      setExpense(detail?.item || null);
      setReceipts(Array.isArray(receiptPayload?.items) ? receiptPayload.items : Array.isArray(receiptPayload) ? receiptPayload : []);
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }

  useEffect(() => {
    if (!expenseId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId]);

  if (status === 'loading') return <LoadingState message="Loading…" />;
  if (status === 'error') return <ErrorState error={error} onRetry={load} />;

  if (!expense) return <EmptyState title="Not found" description="Expense could not be loaded." />;

  const canEdit = String(expense.status || '').toUpperCase() === 'DRAFT';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reimbursement Detail</h1>
          <p className="text-slate-600 mt-1">ID: {expense.id}</p>
        </div>
        <Badge tone={statusTone(expense.status)}>{String(expense.status || '—')}</Badge>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{String(expense.expenseDate || '—')}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</div>
            <div className="mt-1 text-sm font-bold text-slate-900">{fmtMoney(expense.amount)} {expense.currency || 'INR'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Division</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{expense.divisionId || '—'}</div>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</div>
          <div className="mt-1 text-sm text-slate-900">{expense.title || '—'}</div>
          <div className="mt-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</div>
          <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{expense.description || '—'}</div>
        </div>

        <div className="mt-4 text-xs text-slate-500">Editing is {canEdit ? 'allowed (DRAFT)' : 'disabled after submission'}.</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="text-sm font-semibold text-slate-800">Receipts</div>
        </div>
        {receipts.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">No receipts uploaded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">File</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Uploaded</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">{r.fileName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{fmtDate(r.uploadedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => downloadBlob({ path: `/api/v1/expenses/${expenseId}/receipts/${r.id}/download`, filename: r.fileName || 'receipt' })}
                        className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50"
                      >
                        Download
                      </button>
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
