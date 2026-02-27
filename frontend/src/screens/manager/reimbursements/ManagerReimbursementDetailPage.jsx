import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState } from '../../../components/States.jsx';
import { useBootstrap } from '../../../state/bootstrap.jsx';

import { reimbursementApi } from '../../../services/reimbursement.api.js';

import { StatusBadge } from '../../../components/reimbursement/StatusBadge.jsx';
import { PaymentTimeline } from '../../../components/reimbursement/PaymentTimeline.jsx';

function hasPerm(perms, code) {
  const p = perms || [];
  return p.includes('SYSTEM_FULL_ACCESS') || p.includes(code);
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

function RejectModal({ open, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const can = String(reason || '').trim().length > 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-rose-50 to-pink-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Reject Claim</h3>
            <button onClick={onClose} className="text-slate-600 hover:text-slate-900">✕</button>
          </div>
        </div>
        <div className="p-6">
          <label className="block text-sm font-semibold text-slate-700">Reason (required)</label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none"
          />
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</button>
          <button
            disabled={!can}
            onClick={() => onSubmit && onSubmit(String(reason || '').trim())}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              !can ? 'bg-slate-200 text-slate-500' : 'bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:from-rose-700 hover:to-pink-700'
            }`}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export function ManagerReimbursementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];

  const canView = hasPerm(permissions, 'REIMBURSEMENT_VIEW_DIVISION');
  const canApprove = hasPerm(permissions, 'REIMBURSEMENT_APPROVE');
  const canReject = hasPerm(permissions, 'REIMBURSEMENT_REJECT');

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const [item, setItem] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [payments, setPayments] = useState([]);

  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await reimbursementApi.getReimbursementById(id);
      const r = payload?.item;
      setItem(r);

      const [rec, pay] = await Promise.all([
        reimbursementApi.listReceipts(id),
        reimbursementApi.listPayments(id, { page: 1, pageSize: 200 })
      ]);

      setReceipts(Array.isArray(rec?.items) ? rec.items : Array.isArray(rec) ? rec : []);
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
  const isSubmitted = s === 'SUBMITTED';

  async function approve() {
    if (!item) return;
    try {
      setBusy(true);
      setError(null);
      await reimbursementApi.approveReimbursement(id, { version: item.version });
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function reject(reason) {
    if (!item) return;
    try {
      setBusy(true);
      setError(null);
      await reimbursementApi.rejectReimbursement(id, reason, { version: item.version });
      setRejectOpen(false);
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
              <h1 className="text-2xl font-bold text-slate-900">Reimbursement Review</h1>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-slate-600 mt-1">Employee: {item.employeeName || item.employeeId}</p>
            <p className="text-slate-600">ID: {item.id}</p>
          </div>
          <button
            onClick={() => navigate('/manager/reimbursements')}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
          >
            Back
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
            <div className="text-xs text-slate-600 font-semibold">Title</div>
            <div className="text-sm font-bold text-slate-900 mt-1">{item.title}</div>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
            <div className="text-xs text-slate-600 font-semibold">Amount</div>
            <div className="text-lg font-bold text-slate-900">{money(item.totalAmount)}</div>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
            <div className="text-xs text-slate-600 font-semibold">Scope</div>
            <div className="text-sm font-bold text-slate-900 mt-1">{item.scope}</div>
          </div>
        </div>

        {item.description ? (
          <div className="mt-4 bg-white rounded-xl border border-slate-200 p-3">
            <div className="text-xs font-semibold text-slate-600">Description</div>
            <div className="text-sm text-slate-900 mt-1 whitespace-pre-wrap">{item.description}</div>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          {canReject ? (
            <button
              disabled={!isSubmitted || busy}
              onClick={() => setRejectOpen(true)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                !isSubmitted || busy ? 'bg-slate-200 text-slate-500' : 'bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:from-rose-700 hover:to-pink-700'
              }`}
            >
              Reject
            </button>
          ) : null}

          {canApprove ? (
            <button
              disabled={!isSubmitted || busy}
              onClick={approve}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                !isSubmitted || busy ? 'bg-slate-200 text-slate-500' : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700'
              }`}
            >
              Approve
            </button>
          ) : null}
        </div>
      </div>

      {error ? <ErrorState error={error} onRetry={load} /> : null}

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <h2 className="text-lg font-bold text-slate-900">Receipts</h2>
        {(receipts || []).length === 0 ? (
          <div className="mt-3 text-sm text-slate-600">No receipts uploaded.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {receipts.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{r.fileName}</div>
                  <div className="text-xs text-slate-600">{r.contentType} · {Number(r.fileSize || 0).toLocaleString()} bytes</div>
                </div>
                <button
                  onClick={() => reimbursementApi.downloadReceipt(id, r.id, r.fileName)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-100"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaymentTimeline payments={payments} />

      <RejectModal open={rejectOpen} onClose={() => setRejectOpen(false)} onSubmit={reject} />
    </div>
  );
}
