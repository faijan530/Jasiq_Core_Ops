import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { incomeService } from '../../../services/incomeService.js';
import { ErrorState, ForbiddenState, LoadingState, EmptyState } from '../../../components/States.jsx';

export function SuperAdminRevenueCategoriesPage() {
  const [open, setOpen] = useState(false);

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const [edit, setEdit] = useState(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [actionStatus, setActionStatus] = useState('idle');
  const [actionError, setActionError] = useState(null);

  const isEdit = Boolean(edit?.id);

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await incomeService.listCategories();
      const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
      setRows(items);
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (status === 'loading') return <LoadingState message="Loading categories…" />;

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'INCOME_CATEGORY_READ' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  function openCreate() {
    setEdit(null);
    setCode('');
    setName('');
    setDescription('');
    setActionError(null);
    setOpen(true);
  }

  function openEdit(row) {
    setEdit(row);
    setCode(row.code || '');
    setName(row.name || '');
    setDescription(row.description || '');
    setActionError(null);
    setOpen(true);
  }

  async function save() {
    try {
      setActionStatus('loading');
      setActionError(null);
      if (!String(code || '').trim()) throw new Error('Code is required');
      if (!String(name || '').trim()) throw new Error('Name is required');

      if (isEdit) {
        await incomeService.updateCategory(edit.id, {
          code,
          name,
          description,
          isActive: Boolean(edit.isActive),
          version: edit.version
        });
      } else {
        await incomeService.createCategory({ code, name, description });
      }

      setActionStatus('idle');
      setOpen(false);
      await load();
    } catch (err) {
      setActionError(err);
      setActionStatus('idle');
    }
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Revenue Categories</h2>
            <p className="text-sm text-slate-500 mt-1">Manage categories (UI only).</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/super-admin/revenue"
              className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              Back
            </Link>
            <button
              onClick={openCreate}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold shadow hover:from-blue-700 hover:to-indigo-800 transition"
            >
              Add Category
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No categories" description="Create your first category." />
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{r.code}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{r.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        r.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {r.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(r)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-50">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-900">Category</div>
                  <div className="text-sm text-slate-500 mt-1">Add/Edit (UI only).</div>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-slate-100">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Code</label>
                  <input value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="CONSULTING" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Consulting" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Optional" />
                </div>
              </div>

              {actionError ? <div className="mt-4 text-sm text-rose-700">{String(actionError.message || actionError)}</div> : null}

              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  disabled={actionStatus === 'loading'}
                  onClick={save}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold shadow disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
