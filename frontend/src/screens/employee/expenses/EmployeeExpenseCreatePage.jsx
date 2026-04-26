import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../api/client.js';
import { ErrorState, LoadingState } from '../../../components/States.jsx';
import { useBootstrap } from '../../../state/bootstrap.jsx';

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || '');
      const base64 = res.includes('base64,') ? res.split('base64,')[1] : res;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

export function EmployeeExpenseCreatePage() {
  const navigate = useNavigate();
  const { bootstrap } = useBootstrap();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);

  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [titleError, setTitleError] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const cats = await apiFetch('/api/v1/expenses/categories');
      setCategories(Array.isArray(cats?.items) ? cats.items : Array.isArray(cats) ? cats : []);
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (status === 'loading') return <div className="p-8"><LoadingState message="Configuring reimbursement engine..." /></div>;
  if (status === 'error') return <div className="p-8"><ErrorState error={error} onRetry={load} /></div>;

  async function create({ submit }) {
    if (!expenseDate) {
      setSaveError(new Error('Expense date is required.'));
      return;
    }
    if (!categoryId) {
      setCategoryError('Category is required.');
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setSaveError(new Error('Amount must be greater than 0.'));
      return;
    }
    if (!String(title || '').trim()) {
      setTitleError('Title is required.');
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      const body = {
        expenseDate,
        categoryId,
        amount: amt,
        title,
        description,
        paidByMethod: 'OTHER',
        isReimbursement: true,
        vendorName: vendorName || ''
      };

      const created = await apiFetch('/api/v1/expenses', { method: 'POST', body });
      const exp = created?.item || created;
      const id = exp?.id;
      if (!id) throw new Error('Expense creation failed');

      if (attachmentFile) {
        const base64 = await toBase64(attachmentFile);
        await apiFetch(`/api/v1/expenses/${id}/receipts`, {
          method: 'POST',
          body: {
            fileName: attachmentFile.name,
            contentType: attachmentFile.type,
            fileBase64: base64
          }
        });
      }

      if (submit) {
        await apiFetch(`/api/v1/expenses/${id}/submit`, { method: 'POST', body: {} });
      }
      navigate(`/employee/expenses/${id}`);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 space-y-2">
          <h1 className="text-3xl font-black tracking-tight">New Reimbursement</h1>
          <p className="text-slate-400 font-medium">Log your official business expenses for review and settlement.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-200 space-y-10">
        {/* Core Detail Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Transaction Date</label>
             <input 
               type="date" 
               value={expenseDate} 
               onChange={(e) => setExpenseDate(e.target.value)} 
               className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-slate-50/50" 
             />
           </div>

           <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Expense Category</label>
             <select
               value={categoryId}
               onChange={(e) => { setCategoryId(e.target.value); setCategoryError(''); }}
               disabled={categories.length === 0}
               className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-slate-50/50 disabled:opacity-50"
             >
               <option value="">Select Category...</option>
               {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
             {categoryError && <div className="text-[10px] font-bold text-rose-500 uppercase px-1">{categoryError}</div>}
           </div>

           <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Total Amount</label>
             <div className="relative">
                <input 
                   type="number"
                   value={amount} 
                   onChange={(e) => setAmount(e.target.value)} 
                   className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-slate-50/50" 
                   placeholder="0.00" 
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300 uppercase tracking-widest">{bootstrap?.systemConfig?.CURRENCY?.value || 'USD'}</span>
             </div>
           </div>

           <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Vendor / Payee</label>
             <input 
               value={vendorName} 
               onChange={(e) => setVendorName(e.target.value)} 
               className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-slate-50/50" 
               placeholder="e.g. Uber, Amazon, etc." 
             />
           </div>

           <div className="md:col-span-2 space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Brief Title</label>
             <input
               value={title}
               onChange={(e) => { setTitle(e.target.value); setTitleError(''); }}
               className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
               placeholder="Meeting travel expenses"
             />
             {titleError && <div className="text-[10px] font-bold text-rose-500 uppercase px-1">{titleError}</div>}
           </div>

           <div className="md:col-span-2 space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Additional Notes</label>
             <textarea 
               value={description} 
               onChange={(e) => setDescription(e.target.value)} 
               rows={4} 
               className="w-full px-5 py-4 rounded-3xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 bg-slate-50/50 resize-none" 
               placeholder="Provide any context or justification for this expense..."
             />
           </div>
        </div>

        {/* File Attachment */}
        <div className="pt-6 border-t border-slate-50">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 px-1">Digital Receipt / Proof</label>
           <div className="relative group cursor-pointer">
              <input 
                 type="file" 
                 onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} 
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              />
              <div className="flex items-center justify-between p-6 rounded-3xl border-2 border-dashed border-slate-200 group-hover:border-blue-400 group-hover:bg-blue-50/30 transition-all">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <div>
                       <div className="text-sm font-bold text-slate-900">{attachmentFile ? attachmentFile.name : 'Select file to upload'}</div>
                       <div className="text-xs text-slate-400 font-medium">{attachmentFile ? `${(attachmentFile.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, JPG or PNG (Max 5MB)'}</div>
                    </div>
                 </div>
                 <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-4 py-2 bg-blue-50 rounded-xl">Browse Files</div>
              </div>
           </div>
        </div>

        {saveError && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 animate-in slide-in-from-top-2">
             <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <span className="text-xs font-bold uppercase tracking-wide">{saveError.message || String(saveError)}</span>
          </div>
        )}

        <div className="pt-6 flex flex-col md:flex-row items-center justify-end gap-4">
          <button 
             disabled={saving} 
             onClick={() => create({ submit: false })} 
             className="w-full md:w-auto px-10 py-4 rounded-2xl border-2 border-slate-200 bg-white text-sm font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all active:scale-95 uppercase tracking-widest"
          >
            Save for later
          </button>
          <button 
             disabled={saving} 
             onClick={() => create({ submit: true })} 
             className="w-full md:w-auto px-12 py-4 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-blue-600 disabled:opacity-50 transition-all active:scale-95 shadow-xl uppercase tracking-widest"
          >
            {saving ? 'Processing...' : 'Submit Claim'}
          </button>
        </div>
      </div>
    </div>
  );
}
