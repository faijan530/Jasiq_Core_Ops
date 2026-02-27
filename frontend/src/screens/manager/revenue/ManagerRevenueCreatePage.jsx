import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { incomeService } from '../../../services/incomeService.js';
import { getApiBaseUrl, getAuthToken } from '../../../api/client.js';
import { ErrorState, ForbiddenState, LoadingState } from '../../../components/States.jsx';

export function ManagerRevenueCreatePage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const [divisions, setDivisions] = useState([]);
  const [divisionId, setDivisionId] = useState('');
  const [divisionsLoading, setDivisionsLoading] = useState(false);

  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    incomeDate: '',
    divisionId: '',
    categoryId: '',
    title: '',
    description: '',
    amount: ''
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const canSubmit = useMemo(() => {
    return Boolean(form.incomeDate && form.divisionId && form.categoryId && String(form.title || '').trim() && String(form.amount || '').trim());
  }, [form]);

  function setField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const cats = await incomeService.listCategories();
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

  useEffect(() => {
    let cancelled = false;

    async function loadDivisions() {
      try {
        setDivisionsLoading(true);
        const token = getAuthToken();
        const res = await fetch(`${getApiBaseUrl()}/api/v1/governance/divisions?page=1&pageSize=200`, {
          method: 'GET',
          headers: {
            ...(token ? { authorization: `Bearer ${token}` } : {})
          }
        });

        if (!res.ok) {
          console.error('Failed to load divisions', res.status);
          return;
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.error('Failed to load divisions (non-JSON response)');
          return;
        }

        const payload = await res.json();
        const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
        if (!cancelled) setDivisions(items);
      } catch (e) {
        console.error('Failed to load divisions', e);
      } finally {
        if (!cancelled) setDivisionsLoading(false);
      }
    }

    loadDivisions();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') return <LoadingState message="Loading…" />;

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'INCOME_CREATE' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  async function create({ submit }) {
    try {
      setSaving(true);
      setSaveError(null);

      if (!canSubmit) throw new Error('Please fill required fields');

      const created = await incomeService.createIncome({
        incomeDate: form.incomeDate,
        divisionId: form.divisionId,
        categoryId: form.categoryId,
        title: form.title,
        description: form.description || null,
        amount: Number(form.amount),
        currency: 'INR',
        clientId: null,
        invoiceNumber: null
      });

      const item = created?.item || created;
      const id = item?.id;
      if (!id) throw new Error('Income creation failed');

      if (submit) {
        await incomeService.submitIncome(id);
      }

      navigate(`/manager/revenue/${id}`);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Create Income</h2>
            <p className="text-sm text-slate-500 mt-1">Manager view (UI only).</p>
          </div>
          <Link
            to="/manager/revenue"
            className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
          >
            Back
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600">Income Date</label>
              <input
                type="date"
                value={form.incomeDate}
                onChange={(e) => setField('incomeDate', e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Division</label>
              <select
                required
                value={divisionId}
                onChange={(e) => {
                  setDivisionId(e.target.value);
                  setField('divisionId', e.target.value);
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Select Division</option>
                {divisionsLoading ? <option value="">Loading divisions...</option> : null}
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setField('categoryId', e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Select</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600">Title</label>
              <input
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="e.g., Service Delivery"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Amount</label>
              <input
                value={form.amount}
                onChange={(e) => setField('amount', e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {saveError ? <div className="mt-4 text-sm text-rose-700">{String(saveError.message || saveError)}</div> : null}

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
          <button
            disabled={saving}
            onClick={() => create({ submit: false })}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            disabled={saving}
            onClick={() => create({ submit: true })}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold shadow disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
