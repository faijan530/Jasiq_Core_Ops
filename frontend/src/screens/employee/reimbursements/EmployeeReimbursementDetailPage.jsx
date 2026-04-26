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

function money(v, bootstrap) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  const currency = bootstrap?.systemConfig?.CURRENCY?.value || 'USD';
  return n.toLocaleString(undefined, { style: 'currency', currency });
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
    return <div className="p-8"><EmptyState title="No access" description="You don't have permission to view this claim." /></div>;
  }

  if (status === 'loading') return <div className="p-8"><LoadingState message="Fetching claim details..." /></div>;
  if (status === 'error') return <div className="p-8"><ErrorState error={error} onRetry={load} /></div>;
  if (!item) return <div className="p-8"><EmptyState title="Not found" description="Reimbursement not found." /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
               <h1 className="text-3xl font-black tracking-tight">Claim Overview</h1>
               <div className="scale-110"><StatusBadge status={item.status} /></div>
            </div>
            <p className="text-slate-400 font-medium font-mono text-xs uppercase tracking-widest">Reference: {item.id}</p>
          </div>
          <button
            onClick={() => navigate('/employee/reimbursements')}
            className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-black transition-all active:scale-95 border border-white/10 uppercase tracking-widest"
          >
            Back to List
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Left Column: Metrics and Forms */}
         <div className="lg:col-span-2 space-y-8">
            {/* Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Claim', value: item.totalAmount, color: 'text-slate-900', bg: 'bg-slate-50' },
                { label: 'Paid Amount', value: item.paidAmount, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
                { label: 'Balance Due', value: item.dueAmount, color: 'text-blue-600', bg: 'bg-blue-50/50' }
              ].map((metric, idx) => (
                <div key={idx} className={`${metric.bg} rounded-3xl border border-slate-100 p-6 space-y-1`}>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{metric.label}</div>
                  <div className={`text-2xl font-black ${metric.color}`}>{money(metric.value, bootstrap)}</div>
                </div>
              ))}
            </div>

            {/* Linked Entity Alerts */}
            {item.linkedExpenseId && (
              <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg flex items-center gap-4 animate-in slide-in-from-left-4">
                 <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl">🔗</div>
                 <div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-80">System Linked Expense</div>
                    <div className="font-bold">{item.linkedExpenseId}</div>
                 </div>
              </div>
            )}

            {/* Main Form Section */}
            <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-200 space-y-8">
               <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Request Particulars</h2>
                  {isDraft && <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-100">Editable Draft</span>}
               </div>
               
               <ReimbursementForm value={edit} onChange={setEdit} disabled={!canSaveDraft || saving} />

               {isDraft && isReceiptRequired && (receipts?.length || 0) === 0 && (
                 <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-700">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Compliance: Digital receipt required before submission</span>
                 </div>
               )}

               <div className="flex items-center justify-end gap-4 pt-6">
                  {canSaveDraft && (
                    <button
                      onClick={saveDraft}
                      disabled={saving}
                      className="px-10 py-4 rounded-2xl bg-white border-2 border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Update Draft'}
                    </button>
                  )}
                  {canSubmit && isDraft && (
                    <button
                      onClick={submit}
                      disabled={!canSubmitNow || saving}
                      className={`px-12 py-4 rounded-2xl text-sm font-black transition-all active:scale-95 shadow-xl uppercase tracking-widest ${
                        !canSubmitNow || saving
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-900 text-white hover:bg-blue-600'
                      }`}
                    >
                      {saving ? 'Processing...' : 'Submit Claim'}
                    </button>
                  )}
               </div>
            </div>

            {/* Receipts List */}
            <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-xl font-black text-slate-900 tracking-tight">Supporting Documentation</h2>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{receipts.length} Documents</span>
              </div>
              
              {(receipts || []).length === 0 ? (
                <div className="bg-slate-50 rounded-3xl p-12 text-center border-2 border-dashed border-slate-100">
                   <div className="text-3xl mb-4 grayscale opacity-50">📁</div>
                   <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">No attachments found</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {receipts.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group">
                      <div className="flex items-center gap-4 min-w-0">
                         <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                         </div>
                         <div className="min-w-0">
                            <div className="text-sm font-black text-slate-900 truncate">{r.fileName}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{r.contentType} · {(r.fileSize / 1024).toFixed(1)} KB</div>
                         </div>
                      </div>
                      <button
                        onClick={() => reimbursementApi.downloadReceipt(id, r.id, r.fileName)}
                        className="px-6 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
         </div>

         {/* Right Column: Sidebar Actions */}
         <div className="space-y-8">
            <ReceiptUploader reimbursementId={id} disabled={!isDraft || saving} onUploaded={load} />
            <PaymentTimeline payments={payments} />
            
            {/* Status Guide */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16"></div>
               <h3 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                  Processing Guide
               </h3>
               <div className="space-y-4">
                  {[
                    { step: '1', title: 'Draft', desc: 'Initialize your claim and add all details.' },
                    { step: '2', title: 'Submission', desc: 'Lock the claim for manager review.' },
                    { step: '3', title: 'Approval', desc: 'Verified by HR and Finance teams.' },
                    { step: '4', title: 'Payment', desc: 'Settlement via payroll or bank.' }
                  ].map((s, idx) => (
                    <div key={idx} className="flex gap-4">
                       <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black shrink-0">{s.step}</div>
                       <div>
                          <div className="text-xs font-black uppercase tracking-widest text-blue-400">{s.title}</div>
                          <div className="text-[10px] text-slate-400 font-medium leading-relaxed">{s.desc}</div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
