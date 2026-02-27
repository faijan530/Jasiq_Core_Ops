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

  if (status === 'loading') return <LoadingState message="Loading…" />;
  if (status === 'error') return <ErrorState error={error} onRetry={load} />;

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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Reimbursement</h1>
        <p className="text-slate-600 mt-1">Source is fixed to REIMBURSEMENT. Scope is DIVISION.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Date</label>
            <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (e.target.value) setCategoryError('');
              }}
              disabled={categories.length === 0}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
            {categories.length === 0 ? <div className="mt-1 text-xs text-slate-500">No categories available.</div> : null}
            {categoryError ? <div className="mt-1 text-xs text-red-700">{categoryError}</div> : null}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Amount</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="0" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Vendor Name</label>
            <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (String(e.target.value || '').trim()) setTitleError('');
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              placeholder="Taxi reimbursement"
            />
            {titleError ? <div className="mt-1 text-xs text-red-700">{titleError}</div> : null}
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold text-slate-800">Receipt upload</div>
          <div className="mt-2">
            <input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-700" />
          </div>
        </div>

        {saveError ? <div className="mt-4 text-sm text-red-700">{String(saveError.message || saveError)}</div> : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button disabled={saving} onClick={() => create({ submit: false })} className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Save Draft
          </button>
          <button disabled={saving} onClick={() => create({ submit: true })} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium disabled:opacity-50">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
