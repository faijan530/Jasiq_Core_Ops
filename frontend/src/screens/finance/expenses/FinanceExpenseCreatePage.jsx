import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch } from '../../../api/client.js';
import { ErrorState, ForbiddenState, LoadingState } from '../../../components/States.jsx';

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

export function FinanceExpenseCreatePage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const [categories, setCategories] = useState([]);

  const [expenseDate, setExpenseDate] = useState('');
  const [scope, setScope] = useState('COMPANY');
  const [source, setSource] = useState('VENDOR');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [divisionId, setDivisionId] = useState('');
  const [title, setTitle] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [paidByMethod, setPaidByMethod] = useState('BANK_TRANSFER');
  const [description, setDescription] = useState('');

  const [attachmentFile, setAttachmentFile] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const isDivisionRequired = useMemo(() => scope === 'DIVISION', [scope]);

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

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'EXPENSE_CREATE' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  async function create({ submit }) {
    try {
      setSaving(true);
      setSaveError(null);

      if (isDivisionRequired && !divisionId) {
        throw new Error('Division is required for DIVISION scope');
      }

      const body = {
        expenseDate,
        categoryId,
        title,
        description,
        amount: Number(amount),
        currency,
        divisionId: divisionId || null,
        projectId: null,
        paidByMethod,
        vendorName: source === 'VENDOR' ? vendorName : null,
        isReimbursement: source === 'REIMBURSEMENT',
        employeeId: source === 'REIMBURSEMENT' ? null : null
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

      navigate(`/finance/expenses/${id}`);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Expense</h1>
        <p className="text-slate-600 mt-1">Save as draft or submit for approval.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="text-sm font-semibold text-slate-800">Basic Info</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Date</label>
            <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Expense title" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Scope</label>
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="COMPANY">COMPANY</option>
              <option value="DIVISION">DIVISION</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Source</label>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="VENDOR">VENDOR</option>
              <option value="REIMBURSEMENT">REIMBURSEMENT</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Amount</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="INR" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Paid By Method</label>
            <select value={paidByMethod} onChange={(e) => setPaidByMethod(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="BANK_TRANSFER">BANK_TRANSFER</option>
              <option value="UPI">UPI</option>
              <option value="CASH">CASH</option>
              <option value="CARD">CARD</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Division (conditional)</label>
            <input value={divisionId} onChange={(e) => setDivisionId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Division UUID" />
            {isDivisionRequired ? <div className="text-xs text-amber-700 mt-1">Required when Scope = DIVISION</div> : null}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Vendor Name</label>
            <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Vendor" />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" rows={4} />
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold text-slate-800">Attachment upload</div>
          <div className="mt-2">
            <input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-700" />
            <div className="text-xs text-slate-500 mt-1">Accepted: PDF/JPG/PNG (backend enforced).</div>
          </div>
        </div>

        {saveError ? <div className="mt-4 text-sm text-red-700">{String(saveError.message || saveError)}</div> : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            disabled={saving}
            onClick={() => create({ submit: false })}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            disabled={saving}
            onClick={() => create({ submit: true })}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
