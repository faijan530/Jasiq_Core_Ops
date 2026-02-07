import React, { useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

export function DivisionsPage() {
  const { bootstrap } = useBootstrap();
  const title = bootstrap?.ui?.screens?.divisions?.title || 'Divisions';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [createReason, setCreateReason] = useState('');

  const [activationModalOpen, setActivationModalOpen] = useState(false);
  const [activationTarget, setActivationTarget] = useState(null);
  const [activationIsActive, setActivationIsActive] = useState(false);
  const [activationReason, setActivationReason] = useState('');

  const list = usePagedQuery({ path: '/api/v1/governance/divisions', page, pageSize, enabled: true });

  const createMutation = useMutation(async () => {
    return apiFetch('/api/v1/governance/divisions', {
      method: 'POST',
      body: { code: code.trim(), name: name.trim(), reason: createReason || null }
    });
  });

  const toggleMutation = useMutation(async ({ id, isActive, reason }) => {
    return apiFetch(`/api/v1/governance/divisions/${id}/activation`, {
      method: 'PATCH',
      body: { isActive, reason }
    });
  });

  const canCreate = useMemo(() => code.trim().length > 0 && name.trim().length > 0, [code, name]);

  const items = list.data?.items || [];
  const total = list.data?.total || 0;

  if (list.status === 'loading' && !list.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <PageHeader title={title} subtitle="Manage immutable divisions (activation only)." />
        <LoadingState />
      </div>
    );
  }

  if (list.status === 'error') {
    if (list.error?.status === 403) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
          <PageHeader title={title} />
          <ForbiddenState />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <PageHeader title={title} />
        <ErrorState error={list.error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <PageHeader
        title={title}
        subtitle="Only activation can change after creation."
        right={
          <div className="text-xs text-slate-500">Total: {total}</div>
        }
      />

      <div className="mx-4 md:mx-6 lg:mx-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg p-4 relative overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
            <div className="relative z-10">
              <div className="text-sm font-medium text-slate-900">Create Division</div>

              <div className="mt-3 grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Code</label>
                  <input
                    className="mt-1 w-full rounded-xl border-slate-300 text-sm bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={bootstrap?.validation?.rules?.division?.codeMax || 20}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Name</label>
                  <input
                    className="mt-1 w-full rounded-xl border-slate-300 text-sm bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={bootstrap?.validation?.rules?.division?.nameMax || 100}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Reason (optional)</label>
                  <input
                    className="mt-1 w-full rounded-xl border-slate-300 text-sm bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={createReason}
                    onChange={(e) => setCreateReason(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="w-full sm:w-auto inline-flex justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:bg-slate-400"
                  disabled={!canCreate || createMutation.status === 'loading'}
                  onClick={async () => {
                    await createMutation.run();
                    setCode('');
                    setName('');
                    setCreateReason('');
                    list.refresh();
                  }}
                >
                  {createMutation.status === 'loading' ? 'Creating…' : 'Create'}
                </button>

              {createMutation.status === 'error' ? <ErrorState error={createMutation.error} /> : null}
            </div>
          </div>
          </div>

          <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg p-4 relative overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
            <div className="relative z-10">
              <div className="text-sm font-medium text-slate-900">Activation Updates</div>
              <div className="mt-1 text-sm text-slate-600">
                Activation changes require an explicit reason and are audited.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-white/20">
            <div className="text-sm font-semibold text-slate-900">Divisions</div>
          </div>

          {items.length === 0 ? (
            <div className="p-8">
              <EmptyState title="No divisions" description="Create your first division to begin." />
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {items.map((d) => (
                  <div key={d.id} className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg p-4 relative overflow-hidden">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-mono text-sm text-slate-900">{d.code}</div>
                          <div className="mt-1 text-sm text-slate-700">{d.name}</div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${d.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                          {d.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50 transition-all duration-200"
                        disabled={toggleMutation.status === 'loading'}
                        onClick={() => {
                          setActivationTarget(d);
                          setActivationIsActive(!d.isActive);
                          setActivationReason('');
                          setActivationModalOpen(true);
                        }}
                      >
                        Set {d.isActive ? 'Inactive' : 'Active'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <Table
                    columns={[
                      { key: 'code', title: 'Code', render: (_v, d) => <span className="font-mono">{d.code}</span> },
                      { key: 'name', title: 'Name', render: (_v, d) => d.name },
                      { key: 'active', title: 'Active', render: (_v, d) => (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${d.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                          {d.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      )},
                      {
                        key: 'actions',
                        title: 'Actions',
                        render: (_v, d) => (
                          <button
                            type="button"
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50 transition-all duration-200"
                            disabled={toggleMutation.status === 'loading'}
                            onClick={() => {
                              setActivationTarget(d);
                              setActivationIsActive(!d.isActive);
                              setActivationReason('');
                              setActivationModalOpen(true);
                            }}
                          >
                            Set {d.isActive ? 'Inactive' : 'Active'}
                          </button>
                        )
                      }
                    ]}
                    data={items}
                    empty="No divisions found"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {activationModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => {
                if (toggleMutation.status === 'loading') return;
                setActivationModalOpen(false);
                setActivationTarget(null);
                setActivationReason('');
              }}
            />
            <div className="relative w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="text-base font-semibold text-slate-900">
                {activationIsActive ? 'Activate Division' : 'Deactivate Division'}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {activationTarget ? (
                  <span>
                    {activationTarget.code} — {activationTarget.name}
                  </span>
                ) : null}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700">Reason (required)</label>
                <textarea
                  className="mt-1 w-full h-28 rounded-xl border-slate-300 text-sm bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={activationReason}
                  onChange={(e) => setActivationReason(e.target.value)}
                  placeholder="Explain why this activation change is needed"
                />
                {activationReason.trim().length === 0 ? (
                  <div className="mt-1 text-xs text-rose-700">Reason is required.</div>
                ) : null}
              </div>

              {toggleMutation.status === 'error' ? (
                <div className="mt-3">
                  <ErrorState error={toggleMutation.error} />
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50 transition-all duration-200"
                  disabled={toggleMutation.status === 'loading'}
                  onClick={() => {
                    setActivationModalOpen(false);
                    setActivationTarget(null);
                    setActivationReason('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                  disabled={toggleMutation.status === 'loading' || activationReason.trim().length === 0 || !activationTarget}
                  onClick={async () => {
                    await toggleMutation.run({
                      id: activationTarget.id,
                      isActive: activationIsActive,
                      reason: activationReason.trim()
                    });
                    setActivationModalOpen(false);
                    setActivationTarget(null);
                    setActivationReason('');
                    list.refresh();
                  }}
                >
                  {toggleMutation.status === 'loading' ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            className="w-full sm:w-auto rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50 transition-all duration-200"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <div className="text-sm text-slate-600">Page {page}</div>
          <button
            type="button"
            className="w-full sm:w-auto rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50 transition-all duration-200"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
