import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { downloadIncomeDocument, incomeService, toBase64 } from '../../../services/incomeService.js';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../../components/States.jsx';

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  const style =
    s === 'PAID'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : s === 'APPROVED'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : s === 'SUBMITTED'
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : s === 'REJECTED'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}>{s}</span>
  );
}

function formatTs(ts) {
  if (!ts) return '—';
  const s = String(ts);
  return s.replace('T', ' ').replace('Z', '').slice(0, 16);
}

export function FinanceRevenueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const [income, setIncome] = useState(null);
  const [totalPaid, setTotalPaid] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);

  const [docs, setDocs] = useState([]);
  const [payments, setPayments] = useState([]);

  const [actionStatus, setActionStatus] = useState('idle');
  const [actionError, setActionError] = useState(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [uploadFile, setUploadFile] = useState(null);

  async function load() {
    try {
      setStatus('loading');
      setError(null);

      const [detail, docPayload, payPayload] = await Promise.all([
        incomeService.getIncome(id),
        incomeService.listDocuments(id),
        incomeService.listPayments(id)
      ]);

      setIncome(detail?.item || null);
      setTotalPaid(Number(detail?.totalPaid || 0));
      setRemainingAmount(Number(detail?.remainingAmount || 0));

      setDocs(Array.isArray(docPayload?.items) ? docPayload.items : Array.isArray(docPayload) ? docPayload : []);
      setPayments(Array.isArray(payPayload?.items) ? payPayload.items : Array.isArray(payPayload) ? payPayload : []);

      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (status === 'loading') return <LoadingState message="Loading income…" />;

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'INCOME_READ' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  if (!income) return <EmptyState title="Not found" description="Income could not be loaded." />;

  const canSubmit = String(income.status || '').toUpperCase() === 'DRAFT';
  const canApprove = String(income.status || '').toUpperCase() === 'SUBMITTED';
  const canReject = String(income.status || '').toUpperCase() === 'SUBMITTED';
  const canMarkPaid = ['APPROVED', 'PARTIALLY_PAID', 'PAID'].includes(String(income.status || '').toUpperCase());

  async function submit() {
    try {
      setActionStatus('loading');
      setActionError(null);
      await incomeService.submitIncome(id);
      setActionStatus('idle');
      await load();
    } catch (err) {
      setActionError(err);
      setActionStatus('idle');
    }
  }

  async function approve() {
    try {
      setActionStatus('loading');
      setActionError(null);
      await incomeService.approveIncome(id);
      setActionStatus('idle');
      await load();
    } catch (err) {
      setActionError(err);
      setActionStatus('idle');
    }
  }

  async function reject() {
    try {
      setActionStatus('loading');
      setActionError(null);
      await incomeService.rejectIncome(id, rejectReason);
      setActionStatus('idle');
      setRejectOpen(false);
      setRejectReason('');
      await load();
    } catch (err) {
      setActionError(err);
      setActionStatus('idle');
    }
  }

  async function upload() {
    if (!uploadFile) return;
    try {
      setActionStatus('loading');
      setActionError(null);
      const base64 = await toBase64(uploadFile);
      await incomeService.uploadDocument(id, {
        fileName: uploadFile.name,
        contentType: uploadFile.type,
        fileBase64: base64
      });
      setUploadFile(null);
      setActionStatus('idle');
      await load();
    } catch (err) {
      setActionError(err);
      setActionStatus('idle');
    }
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">Income Detail</h2>
              <StatusBadge status={income.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">ID: {income.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/finance/revenue"
              className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              Back
            </Link>
          </div>
        </div>

        {actionError ? <div className="mt-4 text-sm text-rose-700">{String(actionError.message || actionError)}</div> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            disabled={!canSubmit || actionStatus === 'loading'}
            onClick={submit}
            className="px-3 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition disabled:opacity-50"
          >
            Submit
          </button>
          <button
            disabled={!canApprove || actionStatus === 'loading'}
            onClick={approve}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
          >
            Approve
          </button>
          <button
            disabled={!canReject || actionStatus === 'loading'}
            onClick={() => setRejectOpen(true)}
            className="px-3 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition disabled:opacity-50"
          >
            Reject
          </button>
          <button
            disabled={!canMarkPaid}
            onClick={() => navigate(`/finance/revenue/${id}/payments`)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition font-semibold disabled:opacity-50"
          >
            Mark Paid
          </button>
        </div>

        <div className="mt-6 border-b border-slate-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTab('overview')}
              className={`px-4 py-2 text-sm font-semibold rounded-t-xl ${
                tab === 'overview' ? 'bg-slate-50 border border-slate-200 border-b-white' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setTab('documents')}
              className={`px-4 py-2 text-sm font-semibold rounded-t-xl ${
                tab === 'documents' ? 'bg-slate-50 border border-slate-200 border-b-white' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setTab('payments')}
              className={`px-4 py-2 text-sm font-semibold rounded-t-xl ${
                tab === 'payments' ? 'bg-slate-50 border border-slate-200 border-b-white' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setTab('timeline')}
              className={`px-4 py-2 text-sm font-semibold rounded-t-xl ${
                tab === 'timeline' ? 'bg-slate-50 border border-slate-200 border-b-white' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Approval Timeline
            </button>
          </div>
        </div>

        {tab === 'overview' && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-bold text-slate-900">Details</div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Income Date</dt>
                  <dd className="font-semibold text-slate-900">{String(income.incomeDate || '').slice(0, 10)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Division</dt>
                  <dd className="font-semibold text-slate-900">{income.divisionId}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Category</dt>
                  <dd className="font-semibold text-slate-900">{income.categoryName || income.categoryId}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Client</dt>
                  <dd className="font-semibold text-slate-900">{income.clientName || income.clientId || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Invoice</dt>
                  <dd className="font-semibold text-slate-900">{income.invoiceNumber || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Amount</dt>
                  <dd className="font-semibold text-slate-900">₹{Number(income.amount || 0).toLocaleString('en-IN')}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Total Paid</dt>
                  <dd className="font-semibold text-slate-900">₹{Number(totalPaid || 0).toLocaleString('en-IN')}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Outstanding</dt>
                  <dd className="font-semibold text-slate-900">₹{Number(remainingAmount || 0).toLocaleString('en-IN')}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-bold text-slate-900">Description</div>
              <div className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{income.description || '—'}</div>
            </div>
          </div>
        )}

        {tab === 'documents' && (
          <div className="mt-6 rounded-xl border border-slate-200 p-4 bg-slate-50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">Documents</div>
                <div className="text-xs text-slate-500 mt-0.5">Upload and download supporting files.</div>
              </div>
              <div className="flex items-center gap-2">
                <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="block text-sm text-slate-700" />
                <button
                  disabled={!uploadFile || actionStatus === 'loading'}
                  onClick={upload}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Upload
                </button>
              </div>
            </div>

            {docs.length === 0 ? (
              <div className="mt-4 text-sm text-slate-600">No documents uploaded.</div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">File</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {docs.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 text-sm text-slate-700">{d.fileName}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{d.contentType}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => downloadIncomeDocument({ incomeId: id, docId: d.id, fileName: d.fileName })}
                            className="px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-50"
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
        )}

        {tab === 'payments' && (
          <div className="mt-6 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">Payments</div>
                <div className="text-xs text-slate-500 mt-0.5">View payment history</div>
              </div>
              <Link
                to={`/finance/revenue/${id}/payments`}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition font-semibold"
              >
                Open
              </Link>
            </div>
            {payments.length === 0 ? (
              <div className="mt-4 text-sm text-slate-600">No payments found.</div>
            ) : (
              <div className="mt-4 text-sm text-slate-600">Payments recorded: {payments.length}</div>
            )}
          </div>
        )}

        {tab === 'timeline' && (
          <div className="mt-6 rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-bold text-slate-900">Approval Timeline</div>
            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-sm font-semibold text-slate-900">Submitted</div>
                <div className="text-xs text-slate-500">{formatTs(income.submittedAt)}</div>
              </div>
              {income.approvedAt ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-sm font-semibold text-slate-900">Approved</div>
                  <div className="text-xs text-slate-500">{formatTs(income.approvedAt)}</div>
                </div>
              ) : null}
              {income.rejectedAt ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-sm font-semibold text-slate-900">Rejected</div>
                  <div className="text-xs text-slate-500">{formatTs(income.rejectedAt)}</div>
                </div>
              ) : null}
              {!income.approvedAt && !income.rejectedAt ? (
                <div className="p-3 rounded-xl bg-white border border-dashed border-slate-300 text-slate-500 text-sm">Awaiting approval…</div>
              ) : null}
            </div>
          </div>
        )}

        {rejectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setRejectOpen(false)} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-900">Reject Income</div>
                  <div className="text-sm text-slate-500 mt-1">Provide a reason.</div>
                </div>
                <button onClick={() => setRejectOpen(false)} className="p-2 rounded-xl hover:bg-slate-100">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-5">
                <label className="block text-xs font-semibold text-slate-600">Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Reason for rejection"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setRejectOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  disabled={actionStatus === 'loading'}
                  onClick={reject}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold shadow hover:bg-rose-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
