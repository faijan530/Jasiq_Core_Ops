import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch, getApiBaseUrl, getAuthToken } from '../../../api/client.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/States.jsx';
import { useBootstrap } from '../../../state/bootstrap.jsx';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function fmtMoney(n, bootstrap) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '0';
  const currency = bootstrap?.systemConfig?.CURRENCY?.value || 'USD';
  return v.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (!Number.isFinite(dt.getTime())) return String(d);
    return dt.toLocaleString();
  } catch { return String(d); }
}

function getStatusBadge(status) {
  const v = String(status || '').toUpperCase();
  const styles = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    PAID: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  };
  return (
    <span className={cx('inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black border uppercase tracking-widest', styles[v] || styles.DRAFT)}>
      {v || 'PENDING'}
    </span>
  );
}

async function downloadBlob({ path, filename }) {
  const base = getApiBaseUrl();
  const token = getAuthToken();
  const res = await fetch(`${base}${path}`, {
    method: 'GET',
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}) }
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function EmployeeExpenseDetailPage() {
  const { bootstrap } = useBootstrap();
  const { expenseId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [expense, setExpense] = useState(null);
  const [receipts, setReceipts] = useState([]);

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const [detail, receiptPayload] = await Promise.all([
        apiFetch(`/api/v1/expenses/${expenseId}`),
        apiFetch(`/api/v1/expenses/${expenseId}/receipts`)
      ]);
      setExpense(detail?.item || null);
      setReceipts(Array.isArray(receiptPayload?.items) ? receiptPayload.items : Array.isArray(receiptPayload) ? receiptPayload : []);
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }

  useEffect(() => {
    if (!expenseId) return;
    load();
  }, [expenseId]);

  if (status === 'loading') return <div className="p-8"><LoadingState message="Retrieving record details..." /></div>;
  if (status === 'error') return <div className="p-8"><ErrorState error={error} onRetry={load} /></div>;
  if (!expense) return <div className="p-8"><EmptyState title="Record Missing" description="The requested expense claim could not be found." /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Detail Header */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
               <button 
                  onClick={() => navigate(-1)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
               >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
               </button>
               <h1 className="text-3xl font-black tracking-tight">{expense.title || 'Expense Claim'}</h1>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] pl-12">Reference ID: {expense.id}</p>
          </div>
          <div className="pl-12 md:pl-0">
             {getStatusBadge(expense.status)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         {/* Core Info Cards */}
         <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Claim Amount</label>
               <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{fmtMoney(expense.amount, bootstrap)}</span>
                  <span className="text-sm font-black text-blue-600 uppercase tracking-widest">{expense.currency || bootstrap?.systemConfig?.CURRENCY?.value || 'USD'}</span>
               </div>
            </div>
            <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Transaction Date</label>
               <div className="text-lg font-bold text-slate-800">{String(expense.expenseDate || '—')}</div>
            </div>
            <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Allocation Unit</label>
               <div className="text-lg font-bold text-slate-800">{expense.divisionId || 'Corporate General'}</div>
            </div>
         </div>

         {/* Description Panel */}
         <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Detailed Description</label>
            <div className="flex-1 bg-slate-50 p-6 rounded-2xl text-slate-700 font-medium leading-relaxed whitespace-pre-wrap min-h-[160px]">
               {expense.description || 'No additional context provided for this claim.'}
            </div>
            <div className="mt-6 flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
               <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
               <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">
                  Status Tracking: Workflow is currently in {expense.status || 'DRAFT'} state
               </span>
            </div>
         </div>
      </div>

      {/* Receipts Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">Digital Receipts</h2>
          <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg uppercase tracking-widest">
             {receipts.length} Documents
          </span>
        </div>
        
        {receipts.length === 0 ? (
          <div className="p-12 text-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <span className="text-3xl opacity-50">📂</span>
             </div>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No attachments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Name</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {receipts.map((r) => (
                  <tr key={r.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </div>
                          <span className="text-sm font-bold text-slate-900">{r.fileName}</span>
                       </div>
                    </td>
                    <td className="px-8 py-4 text-sm font-bold text-slate-500">{fmtDate(r.uploadedAt)}</td>
                    <td className="px-8 py-4 text-right">
                      <button
                        onClick={() => downloadBlob({ path: `/api/v1/expenses/${expenseId}/receipts/${r.id}/download`, filename: r.fileName || 'receipt' })}
                        className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-blue-600 transition-all uppercase tracking-widest active:scale-95 shadow-lg"
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
    </div>
  );
}
