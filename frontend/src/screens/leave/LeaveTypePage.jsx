import React, { useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function isTruthyConfig(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'enabled' || s === 'on';
}

export function LeaveTypePage() {
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];
  const canRead = permissions.includes('LEAVE_TYPE_READ');
  const canWrite = permissions.includes('LEAVE_TYPE_WRITE');

  const systemConfig = bootstrap?.systemConfig || {};
  const leaveEnabled = isTruthyConfig(systemConfig?.LEAVE_ENABLED?.value ?? systemConfig?.LEAVE_ENABLED);

  const [includeInactive, setIncludeInactive] = useState(false);

  const listPath = useMemo(() => {
    const u = new URL('/api/v1/leave/types', 'http://local');
    if (includeInactive) u.searchParams.set('includeInactive', 'true');
    return u.pathname + u.search;
  }, [includeInactive]);

  const list = usePagedQuery({ path: listPath, page: 1, pageSize: 200, enabled: leaveEnabled && canRead });

  const items = list.data?.items || [];

  const createMutation = useMutation(async (payload) => {
    return apiFetch('/api/v1/leave/types', { method: 'POST', body: payload });
  });

  const updateMutation = useMutation(async ({ id, payload }) => {
    return apiFetch(`/api/v1/leave/types/${id}`, { method: 'PATCH', body: payload });
  });

  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', item? }

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [supportsHalfDay, setSupportsHalfDay] = useState(true);
  const [affectsPayroll, setAffectsPayroll] = useState(false);
  const [deductionRule, setDeductionRule] = useState('');
  const [isActive, setIsActive] = useState(true);

  const openCreate = () => {
    setCode('');
    setName('');
    setIsPaid(false);
    setSupportsHalfDay(true);
    setAffectsPayroll(false);
    setDeductionRule('');
    setIsActive(true);
    setModal({ mode: 'create' });
  };

  const openEdit = (it) => {
    setCode(String(it.code || ''));
    setName(String(it.name || ''));
    setIsPaid(Boolean(it.isPaid));
    setSupportsHalfDay(Boolean(it.supportsHalfDay));
    setAffectsPayroll(Boolean(it.affectsPayroll));
    setDeductionRule(String(it.deductionRule || ''));
    setIsActive(Boolean(it.isActive));
    setModal({ mode: 'edit', item: it });
  };

  const content = useMemo(() => {
    if (!canRead) return <ForbiddenState />;

    if (!leaveEnabled) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-sm font-medium text-slate-900">Leave is disabled</div>
          <div className="mt-1 text-sm text-slate-600">LEAVE_ENABLED must be enabled in system config.</div>
        </div>
      );
    }

    if (list.status === 'loading' && !list.data) return <LoadingState />;

    if (list.status === 'error') {
      return list.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={list.error} />;
    }

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Leave Types</div>
              <div className="mt-1 text-xs text-slate-500">Configure master leave types used for requests and balances.</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={list.refresh}
                disabled={list.status === 'loading'}
              >
                Refresh
              </button>
              {canWrite ? (
                <button
                  type="button"
                  className="w-full sm:w-auto rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400"
                  onClick={openCreate}
                  disabled={createMutation.status === 'loading' || updateMutation.status === 'loading'}
                >
                  New Type
                </button>
              ) : null}
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded border-slate-300"
              />
              Include inactive
            </label>
            <div className="text-xs text-slate-500">Total: {items.length}</div>
          </div>

          <div className="p-4 pt-0">
            {items.length === 0 ? (
              <EmptyState title="No leave types" description="No leave types found." />
            ) : (
              <Table
                columns={[
                  { key: 'code', title: 'Code', render: (_v, d) => <span className="font-mono text-sm text-slate-900">{d.code}</span> },
                  { key: 'name', title: 'Name', render: (_v, d) => <span className="text-sm font-medium text-slate-900">{d.name}</span> },
                  {
                    key: 'flags',
                    title: 'Flags',
                    render: (_v, d) => (
                      <div className="flex flex-wrap gap-2">
                        <span className={cx('text-xs px-2 py-1 rounded-full', d.isPaid ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-800')}>
                          {d.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                        <span className={cx('text-xs px-2 py-1 rounded-full', d.supportsHalfDay ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-800')}>
                          {d.supportsHalfDay ? 'Half-day' : 'Full-day only'}
                        </span>
                        <span className={cx('text-xs px-2 py-1 rounded-full', d.isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700')}>
                          {d.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    )
                  },
                  { key: 'version', title: 'Version', render: (_v, d) => <span className="text-sm text-slate-700">{d.version}</span> },
                  {
                    key: 'action',
                    title: 'Action',
                    render: (_v, d) => (
                      <div className="flex items-center justify-end">
                        {canWrite ? (
                          <button
                            type="button"
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            onClick={() => openEdit(d)}
                          >
                            Edit
                          </button>
                        ) : null}
                      </div>
                    )
                  }
                ]}
                data={items}
              />
            )}
          </div>
        </div>
      </div>
    );
  }, [canRead, canWrite, createMutation.status, includeInactive, items, leaveEnabled, list, updateMutation.status]);

  const submitting = createMutation.status === 'loading' || updateMutation.status === 'loading';

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Leave Types" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mt-4">{content}</div>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (submitting) return;
              setModal(null);
            }}
          />
          <div className="relative w-full max-w-2xl rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">{modal.mode === 'create' ? 'Create Leave Type' : 'Edit Leave Type'}</div>
            <div className="mt-1 text-sm text-slate-600">Updates are version-safe; refresh if you hit a version conflict.</div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Code</label>
                <input
                  className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="ANNUAL"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input
                  className="mt-1 w-full rounded-md border-slate-300 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Annual Leave"
                  disabled={submitting}
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="rounded border-slate-300" disabled={submitting} />
                Paid leave
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={supportsHalfDay}
                  onChange={(e) => setSupportsHalfDay(e.target.checked)}
                  className="rounded border-slate-300"
                  disabled={submitting}
                />
                Supports half-day
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={affectsPayroll}
                  onChange={(e) => setAffectsPayroll(e.target.checked)}
                  className="rounded border-slate-300"
                  disabled={submitting}
                />
                Affects payroll
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-slate-300" disabled={submitting} />
                Active
              </label>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Deduction Rule (optional)</label>
                <input
                  className="mt-1 w-full rounded-md border-slate-300 text-sm"
                  value={deductionRule}
                  onChange={(e) => setDeductionRule(e.target.value)}
                  placeholder=""
                  disabled={submitting}
                />
              </div>
            </div>

            {(createMutation.status === 'error' || updateMutation.status === 'error') ? (
              <div className="mt-3">
                <ErrorState error={createMutation.error || updateMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={submitting}
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={submitting || code.trim().length === 0 || name.trim().length === 0}
                onClick={async () => {
                  try {
                    if (modal.mode === 'create') {
                      await createMutation.run({
                        code: code.trim(),
                        name: name.trim(),
                        isPaid,
                        supportsHalfDay,
                        affectsPayroll,
                        deductionRule: deductionRule.trim() || null,
                        isActive
                      });
                    } else {
                      const it = modal.item;
                      await updateMutation.run({
                        id: it.id,
                        payload: {
                          code: code.trim(),
                          name: name.trim(),
                          isPaid,
                          supportsHalfDay,
                          affectsPayroll,
                          deductionRule: deductionRule.trim() || null,
                          isActive,
                          version: it.version
                        }
                      });
                    }
                    setModal(null);
                    list.refresh();
                  } catch {
                    // handled by hooks
                  }
                }}
              >
                {submitting ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
