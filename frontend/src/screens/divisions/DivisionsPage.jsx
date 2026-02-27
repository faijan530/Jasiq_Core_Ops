import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { apiFetch } from '../../api/client.js';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

export function DivisionsPage() {
  const { bootstrap } = useBootstrap();
  const title = bootstrap?.ui?.screens?.divisions?.title || 'Divisions';
  const canWrite = bootstrap?.permissions?.includes('DIVISION_MANAGE') || false;

  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const roles = bootstrap?.rbac?.roles || [];
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  const [mode, setMode] = useState('list'); // list | create | view
  const [selectedId, setSelectedId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    const pathname = location?.pathname || '';
    const isCreateRoute = pathname.endsWith('/divisions/create');

    if (isCreateRoute) {
      setMode('create');
      setSelectedId(null);
      return;
    }

    if (id) {
      setMode('view');
      setSelectedId(id);
      return;
    }

    setMode('list');
    setSelectedId(null);
  }, [id, location?.pathname]);

  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return window.localStorage.getItem('divisions_context_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [divisionType, setDivisionType] = useState('INTERNAL');
  const [description, setDescription] = useState('');
  const [createReason, setCreateReason] = useState('');

  const [activationModalOpen, setActivationModalOpen] = useState(false);
  const [activationTarget, setActivationTarget] = useState(null);
  const [activationIsActive, setActivationIsActive] = useState(false);
  const [activationReason, setActivationReason] = useState('');

  const [notificationCount, setNotificationCount] = useState(() => {
    try {
      const v = window.localStorage.getItem('divisions_notification_count');
      const n = v ? Number(v) : 0;
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  });

  const incrementNotifications = () => {
    setNotificationCount((prev) => {
      const next = (Number(prev) || 0) + 1;
      try {
        window.localStorage.setItem('divisions_notification_count', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const list = usePagedQuery({ path: '/api/v1/governance/divisions', page, pageSize, enabled: true });

  const detail = usePagedQuery({
    path: selectedId ? `/api/v1/governance/divisions/${selectedId}` : '/api/v1/governance/divisions/__none__',
    page: 1,
    pageSize: 1,
    enabled: mode === 'view' && Boolean(selectedId)
  });

  const createMutation = useMutation(async () => {
    return apiFetch('/api/v1/governance/divisions', {
      method: 'POST',
      body: {
        code: code.trim(),
        name: name.trim(),
        type: divisionType,
        description: description.trim() || null,
        reason: createReason || null
      }
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

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((d) => {
      const codeStr = String(d?.code || '').toLowerCase();
      const nameStr = String(d?.name || '').toLowerCase();
      return codeStr.includes(q) || nameStr.includes(q);
    });
  }, [items, searchTerm]);

  const selectedItem = useMemo(() => {
    if (mode !== 'view' || !selectedId) return null;
    return detail.data?.item || items.find((x) => x.id === selectedId) || null;
  }, [detail.data, items, mode, selectedId]);

  const openDivision = (divisionId) => {
    navigate(`/super-admin/divisions/${divisionId}`);
  };

  const headerMonthLabel = useMemo(() => {
    const createdAt = selectedItem?.createdAt;
    const date = createdAt ? new Date(createdAt) : null;
    if (date && !Number.isNaN(date.getTime())) {
      const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
      return monthYear;
    }
    return '';
  }, [selectedItem]);

  const createdOn = (d) => {
    const s = String(d?.createdAt || '');
    return s ? s.slice(0, 10) : '';
  };

  const typeBadge = (d) => {
    const t = d?.type;
    if (t === 'REVENUE') return 'Revenue';
    if (t === 'INTERNAL') return 'Internal';
    return '—';
  };

  if (list.status === 'loading' && !list.data) {
    return <LoadingState />;
  }

  if (list.status === 'error') {
    if (list.error?.status === 403) {
      return <ForbiddenState />;
    }
    return <ErrorState error={list.error} />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold">
          Divisions
        </h1>
        <p className="text-sm text-gray-500">
          Root of financial attribution
        </p>
      </div>
      
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-4">
          {isSuperAdmin ? (
            <button
              type="button"
              className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 transform hover:scale-105"
              onClick={() => navigate('/super-admin/divisions/create')}
            >
              <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
              <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="relative">Add Division</span>
            </button>
          ) : null}
          {headerMonthLabel ? (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
              <span className="text-sm text-emerald-700 font-medium">{headerMonthLabel}</span>
              <span className="text-emerald-600 font-bold text-xs bg-emerald-200 px-2 py-1 rounded-full">OPEN</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Search and Content */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-green-50/50 px-6 py-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                  </svg>
                </div>
                <input
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                  placeholder="Search divisions by name or code…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 shadow-sm"
              onClick={() => {
                setSearchTerm('');
                navigate('/super-admin/divisions');
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          </div>
        </div>

        <div className="p-4">
          {!bannerDismissed ? (
            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm text-slate-700">
                  <div>Divisions define financial truth.</div>
                  <div>Every salary, expense, and income is ultimately attributed here.</div>
                </div>
                <button
                  type="button"
                  className="text-sm font-medium text-indigo-800 hover:underline"
                  onClick={() => {
                    setBannerDismissed(true);
                    try {
                      window.localStorage.setItem('divisions_context_banner_dismissed', '1');
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}

        {mode === 'list' ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  Divisions
                </div>
                <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                  <span className="text-sm font-medium text-slate-700">{total} total</span>
                </div>
              </div>
            </div>

            <div className="p-4">
              {items.length === 0 ? (
                <EmptyState title="No divisions" description="No divisions found." />
              ) : (
                <>
                  {/* Mobile card layout */}
                  <div className="grid grid-cols-1 gap-4 md:hidden p-4">
                    {filteredItems.map((d) => (
                      <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200">
                        {/* Division name and created date header */}
                        <div className="mb-4 pb-3 border-b border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <button
                              type="button"
                              className="text-lg font-bold text-slate-900 hover:text-emerald-700 transition-colors text-left flex-1"
                              onClick={() => {
                                openDivision(d.id);
                              }}
                            >
                              {d.name}
                            </button>
                            <div>
                              {d.isActive ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-slate-600">
                            <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Created {createdOn(d)}
                          </div>
                        </div>
                        
                        {/* Division details */}
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-semibold">Code</span>
                            <span className="font-mono text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">{d.code}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-semibold">Type</span>
                            <span className="inline-flex rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 bg-white">
                              {typeBadge(d)}
                            </span>
                          </div>
                        </div>
                        
                        {/* View action */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:from-emerald-100 hover:to-green-100 transition-all duration-200 border border-emerald-200"
                            onClick={() => {
                              openDivision(d.id);
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table layout */}
                  <div className="hidden md:block">
                    <Table
                      columns={[
                        {
                          key: 'code',
                          title: 'Division Code',
                          render: (_v, d) => <span className="font-mono text-sm text-slate-900">{d.code}</span>
                        },
                        {
                          key: 'name',
                          title: 'Division Name',
                          render: (_v, d) => (
                            <button
                              type="button"
                              className="text-sm text-indigo-800 hover:underline"
                              onClick={() => {
                                openDivision(d.id);
                              }}
                            >
                              {d.name}
                            </button>
                          )
                        },
                        {
                          key: 'type',
                          title: 'Type',
                          render: (_v, d) => (
                            <span className="inline-flex rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-700">
                              {typeBadge(d)}
                            </span>
                          )
                        },
                        {
                          key: 'status',
                          title: 'Status',
                          render: (_v, d) =>
                            d.isActive ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                                Inactive
                              </span>
                            )
                        },
                        {
                          key: 'createdOn',
                          title: 'Created On',
                          render: (_v, d) => <span className="text-sm text-slate-700">{createdOn(d)}</span>
                        },
                        {
                          key: 'action',
                          title: 'Action',
                          render: (_v, d) => (
                            <button
                              type="button"
                              className="text-sm font-medium text-indigo-800 hover:underline"
                              onClick={() => {
                                openDivision(d.id);
                              }}
                            >
                              View
                            </button>
                          )
                        }
                      ]}
                      data={filteredItems.map((d) => ({
                        ...d,
                        type: d.type,
                        status: d.isActive,
                        createdOn: createdOn(d),
                        action: d.id
                      }))}
                      empty="No divisions found"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[640px]">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    {mode === 'create' ? 'Add Division' : 'Division'}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Root of financial attribution. Changes must be explicit and auditable.
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-slate-400 bg-slate-800 px-3 py-2 text-sm font-medium text-white shadow-md hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                  onClick={() => {
                    navigate('/super-admin/divisions');
                  }}
                >
                  ← Back
                </button>
              </div>

              {mode === 'view' && detail.status === 'loading' && !detail.data ? (
                <div className="mt-4">
                  <LoadingState />
                </div>
              ) : null}

              {mode === 'view' && detail.status === 'error' ? (
                <div className="mt-4">
                  {detail.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={detail.error} />}
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Division Code</label>
                  <div className="mt-1 relative">
                    <input
                      className="w-full rounded-md border-slate-300 text-sm font-mono bg-white disabled:bg-slate-50"
                      value={mode === 'view' ? String(selectedItem?.code || '') : code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={mode === 'view'}
                      maxLength={bootstrap?.validation?.rules?.division?.codeMax || 20}
                    />
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Division codes are permanent. Choose carefully.</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Division Name</label>
                  <input
                    className="mt-1 w-full rounded-md border-slate-300 text-sm bg-white disabled:bg-slate-50"
                    value={mode === 'view' ? String(selectedItem?.name || '') : name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={mode === 'view'}
                    maxLength={bootstrap?.validation?.rules?.division?.nameMax || 100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    className="mt-1 w-full h-24 rounded-md border-slate-300 text-sm bg-white disabled:bg-slate-50"
                    value={mode === 'create' ? description : String(selectedItem?.description || '')}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={mode !== 'create'}
                  />
                </div>

                <div>
                  <div className="block text-sm font-medium text-slate-700">Division Type</div>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        className="border-slate-300"
                        checked={mode === 'create' ? divisionType === 'REVENUE' : selectedItem?.type === 'REVENUE'}
                        onChange={() => setDivisionType('REVENUE')}
                        disabled={mode !== 'create'}
                      />
                      Revenue Generating
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        className="border-slate-300"
                        checked={mode === 'create' ? divisionType === 'INTERNAL' : selectedItem?.type === 'INTERNAL'}
                        onChange={() => setDivisionType('INTERNAL')}
                        disabled={mode !== 'create'}
                      />
                      Internal / Support
                    </label>
                  </div>
                </div>

                <div>
                  <div className="block text-sm font-medium text-slate-700">Status</div>
                  <div className={(selectedItem?.isActive ?? true) ? 'mt-1 text-sm text-emerald-700' : 'mt-1 text-sm text-slate-500'}>
                    {(selectedItem?.isActive ?? true) ? 'Active' : 'Inactive'}
                  </div>
                </div>

                {mode === 'create' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Reason (optional)</label>
                    <input
                      className="mt-1 w-full rounded-md border-slate-300 text-sm bg-white"
                      value={createReason}
                      onChange={(e) => setCreateReason(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>

              {createMutation.status === 'error' ? (
                <div className="mt-3">
                  <ErrorState error={createMutation.error} />
                </div>
              ) : null}

              <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
                {mode === 'create' ? (
                  <button
                    type="button"
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:bg-slate-400"
                    disabled={!canCreate || createMutation.status === 'loading'}
                    onClick={async () => {
                      await createMutation.run();
                      incrementNotifications();
                      setMode('list');
                      setSelectedId(null);
                      setCode('');
                      setName('');
                      setDivisionType('INTERNAL');
                      setDescription('');
                      setCreateReason('');
                      list.refresh();
                    }}
                  >
                    {createMutation.status === 'loading' ? 'Creating…' : 'Create Division'}
                  </button>
                ) : null}

                {mode === 'view' && selectedItem ? (
                  null
                ) : null}

                {mode === 'view' && selectedItem?.isActive && selectedItem?.canDeactivate === false ? (
                  <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-600">
                    <div className="text-sm">Cannot deactivate division:</div>
                    <div className="mt-1 text-sm">
                      {Array.isArray(selectedItem.blockedReasons) && selectedItem.blockedReasons.length > 0 ? (
                        <div className="space-y-0.5">
                          {selectedItem.blockedReasons.map((r, idx) => (
                            <div key={idx}>{r}</div>
                          ))}
                        </div>
                      ) : (
                        <div>Blocked by system rules</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

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
                  className="mt-1 w-full h-28 rounded-md border-slate-300 text-sm bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
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
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
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
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:bg-slate-400"
                  disabled={toggleMutation.status === 'loading' || activationReason.trim().length === 0 || !activationTarget}
                  onClick={async () => {
                    await toggleMutation.run({
                      id: activationTarget.id,
                      isActive: activationIsActive,
                      reason: activationReason.trim()
                    });
                    if (activationIsActive === false) {
                      incrementNotifications();
                    }
                    setActivationModalOpen(false);
                    setActivationTarget(null);
                    setActivationReason('');
                    list.refresh();
                    if (mode === 'view') detail.refresh();
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
            className="w-full sm:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <div className="text-sm text-slate-600">Page {page}</div>
          <button
            type="button"
            className="w-full sm:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      </div>
    </div>
  );
}
