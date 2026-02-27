import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { apiFetch, getApiBaseUrl, getAuthToken } from '../../../api/client.js';
import { ErrorState, ForbiddenState, LoadingState, EmptyState } from '../../../components/States.jsx';

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

export function FinanceExpenseDetailPage() {
  const { expenseId } = useParams();

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const [expense, setExpense] = useState(null);
  const [remainingAmount, setRemainingAmount] = useState(null);
  const [totalPaid, setTotalPaid] = useState(null);

  const [receipts, setReceipts] = useState([]);
  const [payments, setPayments] = useState([]);

  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [payReference, setPayReference] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);

  const visualPaymentState = useMemo(() => {
    const amt = Number(expense?.amount || 0);
    const paid = Number(totalPaid || 0);
    if (!expense) return { label: '—', tone: 'gray' };
    if (amt <= 0) return { label: 'UNPAID', tone: 'gray' };
    if (paid <= 0) return { label: 'UNPAID', tone: 'gray' };
    if (paid + 0.00001 < amt) return { label: 'PARTIAL', tone: 'yellow' };
    return { label: 'PAID', tone: 'green' };
  }, [expense, totalPaid]);

  async function load() {
    try {
      setStatus('loading');
      setError(null);

      const [detail, receiptPayload, paymentPayload] = await Promise.all([
        apiFetch(`/api/v1/expenses/${expenseId}`),
        apiFetch(`/api/v1/expenses/${expenseId}/receipts`),
        apiFetch(`/api/v1/expenses/${expenseId}/payments`)
      ]);

      setExpense(detail?.item || null);
      setRemainingAmount(detail?.remainingAmount ?? null);
      setTotalPaid(detail?.totalPaid ?? null);
      setReceipts(Array.isArray(receiptPayload?.items) ? receiptPayload.items : Array.isArray(receiptPayload) ? receiptPayload : []);
      setPayments(Array.isArray(paymentPayload?.items) ? paymentPayload.items : Array.isArray(paymentPayload) ? paymentPayload : []);

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

  if (status === 'loading') return <LoadingState message="Loading expense…" />;

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'EXPENSE_READ' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  if (!expense) {
    return <EmptyState title="Expense not found" description="The requested expense could not be loaded." />;
  }

  async function markPaid() {
    try {
      setPaying(true);
      setPayError(null);

      const payload = await apiFetch(`/api/v1/expenses/${expenseId}/mark-paid`, {
        method: 'POST',
        body: {
          paidAmount: Number(payAmount),
          paidAt: new Date(),
          method: payMethod,
          referenceId: payReference
        }
      });

      setTotalPaid(payload?.totalPaid ?? totalPaid);
      setRemainingAmount(payload?.remainingAmount ?? remainingAmount);
      setPayAmount('');
      setPayReference('');
      await load();
    } catch (err) {
      setPayError(err);
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Expense Detail</h1>
            <p className="text-slate-600 mt-1">ID: {expense.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(expense.status)}>{String(expense.status || '—')}</Badge>
            <Badge tone={visualPaymentState.tone}>{visualPaymentState.label}</Badge>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expense Date</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{String(expense.expenseDate || '—')}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {fmtMoney(expense.amount)} {expense.currency || 'INR'}
            </div>
            <div className="mt-1 text-xs text-slate-600">Paid: {fmtMoney(totalPaid)} | Remaining: {fmtMoney(remainingAmount)}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Division</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{expense.divisionId || '—'}</div>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</div>
            <div className="mt-1 text-sm text-slate-900">{expense.title || '—'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor / Source</div>
            <div className="mt-1 text-sm text-slate-900">{expense.isReimbursement ? 'REIMBURSEMENT' : expense.vendorName || 'VENDOR'}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</div>
            <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{expense.description || '—'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Approval timeline</div>
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <div>Submitted</div>
              <div className="text-slate-500">{fmtDate(expense.submittedAt)}</div>
            </div>
            <div className="flex items-center justify-between">
              <div>Approved</div>
              <div className="text-slate-500">{fmtDate(expense.approvedAt)}</div>
            </div>
            <div className="flex items-center justify-between">
              <div>Rejected</div>
              <div className="text-slate-500">{fmtDate(expense.rejectedAt)}</div>
            </div>
            {expense.decisionReason ? <div className="text-xs text-slate-600 mt-2">Reason: {expense.decisionReason}</div> : null}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="text-sm font-semibold text-slate-800">Mark payment</div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Amount</label>
              <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Method</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                <option value="UPI">UPI</option>
                <option value="CASH">CASH</option>
                <option value="CARD">CARD</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reference</label>
              <input value={payReference} onChange={(e) => setPayReference(e.target.value)} placeholder="UTR / Ref" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            </div>
          </div>

          {payError ? <div className="mt-3 text-sm text-red-700">{String(payError.message || payError)}</div> : null}

          <div className="mt-4 flex items-center justify-end">
            <button
              disabled={paying}
              onClick={markPaid}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {paying ? 'Saving…' : 'Mark Paid'}
            </button>
          </div>

          <div className="mt-3">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-2 bg-emerald-500"
                style={{
                  width: `${Math.min(100, Math.max(0, (Number(totalPaid || 0) / Math.max(1, Number(expense.amount || 0))) * 100))}%`
                }}
              />
            </div>
            <div className="mt-2 text-xs text-slate-600">Payment progress</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-800">Payment history</div>
          </div>
          {payments.length === 0 ? (
            <div className="p-4 text-sm text-slate-600">No payments recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Paid At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reference</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">{fmtDate(p.paidAt)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{p.method}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{p.referenceId || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right">{fmtMoney(p.paidAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
