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
    return <div className="p-8"><ErrorState error={{ status: 403, message: 'Required permission: REIMBURSEMENT_CREATE_SELF' }} /></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 space-y-2">
          <h1 className="text-3xl font-black tracking-tight">Draft New Claim</h1>
          <p className="text-slate-400 font-medium">Initialize a new reimbursement request. You can add receipts in the next step.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-200 space-y-8">
        <div className="space-y-6">
           <ReimbursementForm value={form} onChange={setForm} disabled={status === 'loading'} />
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 animate-in slide-in-from-top-2">
             <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <span className="text-xs font-bold uppercase tracking-wide">{error.message || String(error)}</span>
          </div>
        )}

        <div className="pt-8 border-t border-slate-50 flex flex-col md:flex-row items-center justify-end gap-4">
          <button
            onClick={() => navigate('/employee/reimbursements')}
            className="w-full md:w-auto px-10 py-4 rounded-2xl border-2 border-slate-200 bg-white text-sm font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all active:scale-95 uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit || status === 'loading'}
            onClick={create}
            className={`w-full md:w-auto px-12 py-4 rounded-2xl text-sm font-black transition-all active:scale-95 shadow-xl uppercase tracking-widest ${
              !canSubmit || status === 'loading'
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-indigo-600'
            }`}
          >
            {status === 'loading' ? 'Initializing...' : 'Create Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}
