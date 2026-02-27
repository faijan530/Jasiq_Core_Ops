import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState } from '../../../components/States.jsx';
import { useBootstrap } from '../../../state/bootstrap.jsx';

import { reimbursementApi } from '../../../services/reimbursement.api.js';

import { StatusBadge } from '../../../components/reimbursement/StatusBadge.jsx';
import { PaymentTimeline } from '../../../components/reimbursement/PaymentTimeline.jsx';

import { usePagedQuery } from '../../../hooks/usePagedQuery.js';

function hasPerm(perms, code) {
  const p = perms || [];
  return p.includes('SYSTEM_FULL_ACCESS') || p.includes(code);
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

export function SuperAdminReimbursementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];
  const canView = hasPerm(permissions, 'REIMBURSEMENT_VIEW_DIVISION') || hasPerm(permissions, 'REIMBURSEMENT_VIEW_SELF');

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const [item, setItem] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [payments, setPayments] = useState([]);

  const canAudit = hasPerm(permissions, 'GOV_AUDIT_READ');

  const auditPath = useMemo(() => {
    const u = new URL('/api/v1/governance/audit', 'http://local');
    u.searchParams.set('entityId', String(id));
    u.searchParams.set('page', '1');
    u.searchParams.set('pageSize', '50');
    return u.pathname + u.search;
  }, [id]);

  const audit = usePagedQuery({ path: auditPath, page: 1, pageSize: 50, enabled: canAudit });

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await reimbursementApi.getReimbursementById(id);
      setItem(payload?.item || null);

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

  if (!canView) return <EmptyState title="No access" description="You don't have permission to view this claim." />;
  if (status === 'loading') return <LoadingState message="Loading claim…" />;
  if (status === 'error') return <ErrorState error={error} onRetry={load} />;
  if (!item) return <EmptyState title="Not found" description="Reimbursement not found." />;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Reimbursement</h1>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-slate-600 mt-1">Employee: {item.employeeName || item.employeeId}</p>
            <p className="text-slate-600">ID: {item.id}</p>
          </div>
          <button
            onClick={() => navigate('/super-admin/reimbursements')}
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

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Audit Trail</h2>
          {!canAudit ? <div className="text-xs text-slate-500">Requires GOV_AUDIT_READ</div> : null}
        </div>

        {!canAudit ? (
          <div className="mt-3 text-sm text-slate-600">Audit trail not available.</div>
        ) : audit.status === 'loading' && !audit.data ? (
          <div className="mt-3 text-sm text-slate-600">Loading audit…</div>
        ) : audit.status === 'error' ? (
          <div className="mt-3 text-sm text-rose-600">Failed to load audit.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">When</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Action</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Actor</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(audit.data?.items || []).map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2 text-sm text-slate-700">{String(a.createdAt || a.created_at || '').replace('T', ' ').slice(0, 19)}</td>
                    <td className="px-4 py-2 text-sm font-semibold text-slate-900">{a.action}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">{a.actorId || a.actor_id || '—'}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">{a.reason || '—'}</td>
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
