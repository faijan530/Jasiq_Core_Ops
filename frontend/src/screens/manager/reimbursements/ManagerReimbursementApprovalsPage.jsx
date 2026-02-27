import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState } from '../../../components/States.jsx';
import { useBootstrap } from '../../../state/bootstrap.jsx';

import { reimbursementApi } from '../../../services/reimbursement.api.js';
import { ReimbursementTable } from '../../../components/reimbursement/ReimbursementTable.jsx';

function hasPerm(perms, code) {
  const p = perms || [];
  return p.includes('SYSTEM_FULL_ACCESS') || p.includes(code);
}

export function ManagerReimbursementApprovalsPage() {
  const navigate = useNavigate();
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];
  const canView = hasPerm(permissions, 'REIMBURSEMENT_VIEW_DIVISION');

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [month, setMonth] = useState('');

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await reimbursementApi.getAllReimbursements({
        page,
        pageSize,
        status: 'SUBMITTED',
        month: month || null
      });
      setData(payload);
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
  }, [page, month, canView]);

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const total = useMemo(() => Number(data?.total || 0), [data]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  if (!canView) {
    return <EmptyState title="No access" description="You don't have permission to view division reimbursements." />;
  }

  if (status === 'loading') return <LoadingState message="Loading approvals…" />;
  if (status === 'error') return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reimbursement Approvals</h1>
        <p className="text-slate-600 mt-1">Review submitted claims for your division.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            />
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No submitted claims" description="There are no submitted reimbursements to review." />
      ) : (
        <ReimbursementTable
          variant="manager"
          rows={items}
          loading={false}
          empty="No submitted claims"
          onRowClick={(r) => navigate(`/manager/reimbursements/${r.id}`)}
        />
      )}

      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/60 shadow-sm px-4 py-3">
        <div className="text-sm text-slate-600">
          Page {page} of {totalPages} (Total: {total})
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
