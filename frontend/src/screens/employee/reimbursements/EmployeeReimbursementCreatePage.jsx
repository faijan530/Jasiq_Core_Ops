import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErrorState } from '../../../components/States.jsx';
import { useBootstrap } from '../../../state/bootstrap.jsx';

import { reimbursementApi } from '../../../services/reimbursement.api.js';
import { ReimbursementForm } from '../../../components/reimbursement/ReimbursementForm.jsx';

function hasPerm(perms, code) {
  const p = perms || [];
  return p.includes('SYSTEM_FULL_ACCESS') || p.includes(code);
}

export function EmployeeReimbursementCreatePage() {
  const navigate = useNavigate();
  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];

  const canCreate = hasPerm(permissions, 'REIMBURSEMENT_CREATE_SELF');

  const [form, setForm] = useState({
    claimDate: new Date().toISOString().slice(0, 10),
    title: '',
    description: '',
    totalAmount: ''
  });

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const canSubmit = useMemo(() => {
    if (!canCreate) return false;
    if (!form.claimDate) return false;
    if (!String(form.title || '').trim()) return false;
    const n = Number(form.totalAmount);
    if (!Number.isFinite(n) || n < 0) return false;
    return true;
  }, [form, canCreate]);

  async function create() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await reimbursementApi.createDraft({
        claimDate: form.claimDate,
        title: String(form.title || '').trim(),
        description: String(form.description || '').trim() || null,
        totalAmount: Number(form.totalAmount)
      });
      const id = payload?.item?.id;
      if (id) {
        navigate(`/employee/reimbursements/${id}`);
        return;
      }
      navigate('/employee/reimbursements');
    } catch (e) {
      setError(e);
      setStatus('error');
    }
  }

  if (!canCreate) {
    return <ErrorState error={{ status: 403, message: 'Required permission: REIMBURSEMENT_CREATE_SELF' }} />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <h1 className="text-2xl font-bold text-slate-900">New Reimbursement Claim</h1>
        <p className="text-slate-600 mt-1">Create a draft claim. It will be locked after submission.</p>
      </div>

      {error ? <ErrorState error={error} onRetry={create} /> : null}

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <ReimbursementForm value={form} onChange={setForm} disabled={status === 'loading'} />

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={() => navigate('/employee/reimbursements')}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit || status === 'loading'}
            onClick={create}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              !canSubmit || status === 'loading'
                ? 'bg-slate-200 text-slate-500'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
            }`}
          >
            {status === 'loading' ? 'Creating…' : 'Create Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}
