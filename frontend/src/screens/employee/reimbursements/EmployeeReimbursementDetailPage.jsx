import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState } from '../../../components/States.jsx';
import { useBootstrap } from '../../../state/bootstrap.jsx';

import { reimbursementApi } from '../../../services/reimbursement.api.js';

import { StatusBadge } from '../../../components/reimbursement/StatusBadge.jsx';
import { ReimbursementForm } from '../../../components/reimbursement/ReimbursementForm.jsx';
import { ReceiptUploader } from '../../../components/reimbursement/ReceiptUploader.jsx';
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

export function EmployeeReimbursementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];
  const sysCfg = bootstrap?.systemConfig || {};

  const receiptRequiredRaw = sysCfg?.REIMBURSEMENT_RECEIPT_REQUIRED?.value ?? sysCfg?.REIMBURSEMENT_RECEIPT_REQUIRED;
  const receiptRequired = String(receiptRequiredRaw ?? '').trim().toLowerCase();
  const isReceiptRequired = receiptRequired === 'true' || receiptRequired === '1' || receiptRequired === 'yes' || receiptRequired === 'enabled' || receiptRequired === 'on';

  const canView = hasPerm(permissions, 'REIMBURSEMENT_VIEW_SELF');
  const canEditDraft = hasPerm(permissions, 'REIMBURSEMENT_EDIT_SELF_DRAFT');
  const canSubmit = hasPerm(permissions, 'REIMBURSEMENT_SUBMIT_SELF');

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const [item, setItem] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [payments, setPayments] = useState([]);

  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await reimbursementApi.getReimbursementById(id);
      const r = payload?.item;
      setItem(r);
      setEdit({
        claimDate: r?.claimDate ? String(r.claimDate).slice(0, 10) : '',
        title: r?.title || '',
        description: r?.description || '',
        totalAmount: r?.totalAmount ?? ''
      });

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
  const isDraft = s === 'DRAFT';

  const canSaveDraft = canEditDraft && isDraft;

  const canSubmitNow = useMemo(() => {
    if (!canSubmit || !isDraft) return false;
    if (isReceiptRequired && (receipts?.length || 0) === 0) return false;
    return true;
  }, [canSubmit, isDraft, isReceiptRequired, receipts]);

  async function saveDraft() {
    if (!item) return;
    try {
      setSaving(true);
      setError(null);
      const payload = await reimbursementApi.updateDraft(id, {
        title: String(edit?.title || '').trim(),
        description: String(edit?.description || '').trim() || null,
        totalAmount: Number(edit?.totalAmount),
        version: item.version
      });
      setItem(payload?.item || item);
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    if (!item) return;
    try {
      setSaving(true);
      setError(null);
      await reimbursementApi.submitReimbursement(id, { version: item.version });
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return <EmptyState title="No access" description="You don't have permission to view this claim." />;
  }

  if (status === 'loading') return <LoadingState message="Loading claim…" />;
  if (status === 'error') return <ErrorState error={error} onRetry={load} />;
  if (!item) return <EmptyState title="Not found" description="Reimbursement not found." />;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Reimbursement</h1>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-slate-600 mt-1">ID: {item.id}</p>
          </div>
          <button
            onClick={() => navigate('/employee/reimbursements')}
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

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="text-sm font-semibold text-amber-900">Important</div>
          <div className="text-sm text-amber-800 mt-1">Claim will be locked after submission.</div>
        </div>
      </div>

      {error ? <ErrorState error={error} onRetry={load} /> : null}

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <h2 className="text-lg font-bold text-slate-900">Details</h2>
        <div className="mt-4">
          <ReimbursementForm value={edit} onChange={setEdit} disabled={!canSaveDraft || saving} />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          {canSaveDraft ? (
            <button
              onClick={saveDraft}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Save Draft
            </button>
          ) : null}

          {canSubmit ? (
            <button
              onClick={submit}
              disabled={!canSubmitNow || saving}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                !canSubmitNow || saving
                  ? 'bg-slate-200 text-slate-500'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
              }`}
            >
              Submit
            </button>
          ) : null}
        </div>

        {isDraft && isReceiptRequired && (receipts?.length || 0) === 0 ? (
          <div className="mt-3 text-xs text-amber-700">
            Receipt is required before submission.
          </div>
        ) : null}
      </div>

      <ReceiptUploader reimbursementId={id} disabled={!isDraft || saving} onUploaded={load} />

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
    </div>
  );
}
