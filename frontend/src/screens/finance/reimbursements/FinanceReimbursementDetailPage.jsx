import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState } from '../../../components/States.jsx';
import { useBootstrap } from '../../../state/bootstrap.jsx';

import { reimbursementApi } from '../../../services/reimbursement.api.js';

import { StatusBadge } from '../../../components/reimbursement/StatusBadge.jsx';
import { PaymentTimeline } from '../../../components/reimbursement/PaymentTimeline.jsx';
import { PaymentModal } from '../../../components/reimbursement/PaymentModal.jsx';

function hasPerm(perms, code) {
  const p = perms || [];
  return p.includes('SYSTEM_FULL_ACCESS') || p.includes(code);
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

export function FinanceReimbursementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];

  const canView = hasPerm(permissions, 'REIMBURSEMENT_VIEW_DIVISION');
  const canPay = hasPerm(permissions, 'REIMBURSEMENT_ADD_PAYMENT');
  const canClose = hasPerm(permissions, 'REIMBURSEMENT_CLOSE');

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const [item, setItem] = useState(null);
  const [payments, setPayments] = useState([]);

  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await reimbursementApi.getReimbursementById(id);
      setItem(payload?.item || null);

      const pay = await reimbursementApi.listPayments(id, { page: 1, pageSize: 200 });
      setPayments(Array.isArray(pay?.items) ? pay.items : []);

      setStatus('ready');
    } catch (e) {
      setError(e);
      setStatus('error');
    }
  }

  useEffect(() => {
    if (!canView) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, canView]);

  const s = String(item?.status || '').toUpperCase();
  const canAddPaymentNow = canPay && s === 'APPROVED';
  const canCloseNow = canClose && s === 'PAID';

  async function addPayment(payload) {
    if (!item) return;
    try {
      setBusy(true);
      setError(null);

      await reimbursementApi.addReimbursementPayment(id, {
        paidAmount: Number(payload.amount),
        method: payload.method,
        referenceId: payload.referenceId || null,
        note: payload.note || null,
        paidAt: new Date().toISOString(),
        version: item.version
      });

      setPayOpen(false);
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    if (!item) return;
    try {
      setBusy(true);
      setError(null);
      await reimbursementApi.closeReimbursement(id, { version: item.version });
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  if (!canView) return <EmptyState title="No access" description="You don't have permission to view this claim." />;
  if (status === 'loading') return <LoadingState message="Loading claim…" />;
  if (status === 'error') return <ErrorState error={error} onRetry={load} />;
  if (!item) return <EmptyState title="Not found" description="Reimbursement not found." />;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Finance Settlement</h1>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-slate-600 mt-1">ID: {item.id}</p>
          </div>
          <button
            onClick={() => navigate('/finance/reimbursements')}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
          >
            Back
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
            <div className="text-xs text-slate-600 font-semibold">Total</div>
            <div className="text-lg font-bold text-slate-900">{money(item.totalAmount)}</div>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
            <div className="text-xs text-slate-600 font-semibold">Paid</div>
            <div className="text-lg font-bold text-slate-900">{money(item.paidAmount)}</div>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
            <div className="text-xs text-slate-600 font-semibold">Due</div>
            <div className="text-lg font-bold text-slate-900">{money(item.dueAmount)}</div>
          </div>
        </div>

        {item.linkedExpenseId ? (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div className="text-xs font-semibold text-blue-800">Linked Expense (read-only)</div>
            <div className="text-sm text-blue-900 mt-1">{item.linkedExpenseId}</div>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          {canAddPaymentNow ? (
            <button
              disabled={busy}
              onClick={() => setPayOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
            >
              Add Payment
            </button>
          ) : null}

          {canCloseNow ? (
            <button
              disabled={busy}
              onClick={close}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Close
            </button>
          ) : null}
        </div>

        {s === 'APPROVED' ? (
          <div className="mt-3 text-xs text-slate-600">Payments allowed only when status is APPROVED.</div>
        ) : null}
        {s === 'PAID' ? (
          <div className="mt-3 text-xs text-slate-600">Close is available only when status is PAID.</div>
        ) : null}
      </div>

      {error ? <ErrorState error={error} onRetry={load} /> : null}

      <PaymentTimeline payments={payments} />

      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} onSubmit={addPayment} maxAmount={Number(item.dueAmount || 0)} />
    </div>
  );
}
