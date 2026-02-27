import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { incomeService } from '../../../services/incomeService.js';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../../components/States.jsx';

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  const style =
    s === 'APPROVED'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : s === 'SUBMITTED'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}>{s}</span>
  );
}

export function ManagerRevenueDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState('overview');

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const [income, setIncome] = useState(null);
  const [docs, setDocs] = useState([]);
  const [payments, setPayments] = useState([]);

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
          <Link
            to="/manager/revenue"
            className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
          >
            Back
          </Link>
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
                  <dt className="text-slate-500">Amount</dt>
                  <dd className="font-semibold text-slate-900">₹{Number(income.amount || 0).toLocaleString('en-IN')}</dd>
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
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">Documents</div>
                <div className="text-xs text-slate-500 mt-0.5">Uploaded documents</div>
              </div>
              <span className="text-xs text-slate-500">Upload handled by Finance</span>
            </div>
            {docs.length === 0 ? (
              <div className="mt-4 text-sm text-slate-600">No documents uploaded.</div>
            ) : (
              <div className="mt-4 text-sm text-slate-600">Documents: {docs.length}</div>
            )}
          </div>
        )}

        {tab === 'payments' && (
          <div className="mt-6 rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-bold text-slate-900">Payments</div>
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
                <div className="text-xs text-slate-500">{income.submittedAt ? String(income.submittedAt).replace('T', ' ').slice(0, 16) : '—'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-sm font-semibold text-slate-900">Approved</div>
                <div className="text-xs text-slate-500">{income.approvedAt ? String(income.approvedAt).replace('T', ' ').slice(0, 16) : '—'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
