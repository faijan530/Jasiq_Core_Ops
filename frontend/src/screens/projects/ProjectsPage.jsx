import React, { useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { Table } from '../../components/Table.jsx';

function buildPath(divisionId) {
  const u = new URL('/api/v1/governance/projects', 'http://local');
  if (divisionId) u.searchParams.set('divisionId', divisionId);
  return u.pathname + u.search;
}

export function ProjectsPage() {
  const { bootstrap } = useBootstrap();
  const title = bootstrap?.ui?.screens?.projects?.title || 'Projects / Programs';

  const [mode, setMode] = useState('list'); // list | create
  const [expandedProjectId, setExpandedProjectId] = useState(null);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');

  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return window.localStorage.getItem('projects_context_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });

  const [divisionId, setDivisionId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [createReason, setCreateReason] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [activationModalOpen, setActivationModalOpen] = useState(false);
  const [activationTarget, setActivationTarget] = useState(null);
  const [activationIsActive, setActivationIsActive] = useState(false);
  const [activationReason, setActivationReason] = useState('');

  const divisions = usePagedQuery({ path: '/api/v1/governance/divisions', page: 1, pageSize: 200, enabled: true });

  const list = usePagedQuery({
    path: buildPath(divisionId || null),
    page,
    pageSize,
    enabled: true
  });

  const detail = usePagedQuery({
    path: expandedProjectId ? `/api/v1/governance/projects/${expandedProjectId}` : '/api/v1/governance/projects/__none__',
    page: 1,
    pageSize: 1,
    enabled: Boolean(expandedProjectId)
  });

  const createMutation = useMutation(async () => {
    return apiFetch('/api/v1/governance/projects', {
      method: 'POST',
      body: {
        divisionId: divisionId,
        code: code.trim(),
        name: name.trim(),
        reason: createReason || null
      }
    });
  });

  const updateMutation = useMutation(async ({ id, isActive, reason }) => {
    return apiFetch(`/api/v1/governance/projects/${id}`, {
      method: 'PATCH',
      body: { isActive, reason }
    });
  });

  const canCreate = useMemo(
    () => divisionId.trim().length > 0 && code.trim().length > 0 && name.trim().length > 0,
    [divisionId, code, name]
  );

  const items = list.data?.items || [];
  const total = list.data?.total || 0;
  const divisionOptions = divisions.data?.items || [];

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => {
      const codeStr = String(p?.code || '').toLowerCase();
      const nameStr = String(p?.name || '').toLowerCase();
      return codeStr.includes(q) || nameStr.includes(q);
    });
  }, [items, searchTerm]);

  const createdOn = (p) => {
    const s = String(p?.createdAt || '');
    return s ? s.slice(0, 10) : '';
  };

  const linkedDivision = (p) => {
    return divisionOptions.find(d => d.id === p.divisionId)?.name || '—';
  };

  const formatCreatorName = (creatorId) => {
    // If no creator ID, show "System"
    if (!creatorId) return 'System';
    
    // If it looks like a UUID (contains hyphens and proper length), show "System Admin"
    // This prevents exposing raw UUIDs to users
    if (typeof creatorId === 'string' && creatorId.includes('-') && creatorId.length > 20) {
      return 'System Admin';
    }
    
    // If it's already a human-readable name, return as-is
    if (typeof creatorId === 'string' && !creatorId.includes('-')) {
      return creatorId;
    }
    
    // Default fallback
    return 'System';
  };

  const expandedProject = useMemo(() => {
    if (!expandedProjectId) return null;
    // First try to find in the items list (more efficient)
    const found = items.find((x) => x.id === expandedProjectId);
    if (found) return found;
    // Fallback to detail API if not found in items
    return detail.data?.item || null;
  }, [items, expandedProjectId, detail.data]);

  const toggleProjectExpansion = (projectId) => {
    setExpandedProjectId(expandedProjectId === projectId ? null : projectId);
  };

  const projectCreatedOn = (p) => {
    const s = String(p?.createdAt || '');
    return s ? s.slice(0, 10) : '';
  };

  const isCreateFormValid = () => {
    return code.trim() && name.trim() && createReason.trim();
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
          Projects / Programs
        </h1>
        <p className="text-sm text-gray-500">
          Work attribution and reporting context
        </p>
      </div>
      
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                </svg>
              </div>
              <input
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="Search projects by name or code…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-violet-700 transition-all duration-200 transform hover:scale-105"
            onClick={() => {
              setCreateModalOpen(true);
            }}
          >
            <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
            <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="relative hidden sm:inline">Create Project</span>
            <span className="relative sm:hidden">Create</span>
          </button>
        </div>
      </div>

      {/* Projects Content */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-violet-50/50 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              Projects
            </div>
            <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
              <span className="text-sm font-medium text-slate-700">{total} total</span>
            </div>
          </div>
        </div>
          {!bannerDismissed ? (
            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm text-slate-700">
                  <div>Projects are optional.</div>
                  <div>They help understand where time was spent, not where money was booked.</div>
                </div>
                <button
                  type="button"
                  className="text-sm font-medium text-indigo-800 hover:underline"
                  onClick={() => {
                    setBannerDismissed(true);
                    try {
                      window.localStorage.setItem('projects_context_banner_dismissed', '1');
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

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mx-4 my-4">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-base font-bold text-slate-900">Project List</div>
              <div className="text-xs text-slate-500">{filteredItems.length} of {total}</div>
            </div>
          </div>

          <div className="p-4">
            {items.length === 0 ? (
              <EmptyState 
                title="No projects yet" 
                description="Projects help teams understand where effort was spent. They are optional and can be added anytime."
                action={
                  <button
                    type="button"
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                    onClick={() => {
                      document.getElementById('create-project-form')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Create Project
                  </button>
                }
              />
            ) : (
              <>
                {/* Mobile card layout */}
                <div className="grid grid-cols-1 gap-4 md:hidden p-4">
                  {filteredItems.map((p) => (
                    <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200">
                      {/* Project name and created date header */}
                      <div className="mb-4 pb-3 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            type="button"
                            className="text-lg font-bold text-slate-900 hover:text-purple-700 transition-colors text-left flex-1"
                            onClick={() => {
                              toggleProjectExpansion(p.id);
                            }}
                          >
                            {p.name}
                          </button>
                          <div>
                            {p.isActive ? (
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
                          Created {createdOn(p)}
                        </div>
                      </div>
                       
                      {/* Project details */}
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-semibold">Code</span>
                          <span className="font-mono text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">{p.code}</span>
                        </div>
                        <div className="flex items-start justify-between">
                          <span className="text-slate-600 font-semibold">Division</span>
                          <span className="text-slate-900 text-right max-w-[140px] truncate font-medium">{linkedDivision(p)}</span>
                        </div>
                      </div>
                       
                      {/* View action */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 px-4 py-3 text-sm font-semibold text-purple-800 hover:from-purple-100 hover:to-violet-100 transition-all duration-200 border border-purple-200"
                          onClick={() => {
                            toggleProjectExpansion(p.id);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {expandedProjectId === p.id ? 'Hide Details' : 'View Details'}
                        </button>
                      </div>

                      {/* Inline project details */}
                      {expandedProjectId === p.id && expandedProject ? (
                        <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50 -mx-4 px-4 -mb-4 pb-4 rounded-b-lg">
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600 font-medium">Project Code:</span>
                              <span className="font-mono text-slate-900">{expandedProject.code}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 font-medium">Project Name:</span>
                              <span className="text-slate-900">{expandedProject.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 font-medium">Linked Division:</span>
                              <span className="text-slate-900">{linkedDivision(expandedProject)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 font-medium">Status:</span>
                              <span>
                                {expandedProject.isActive ? (
                                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                    Inactive
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 font-medium">Created Date:</span>
                              <span className="text-slate-900">{projectCreatedOn(expandedProject)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 font-medium">Created by:</span>
                              <span className="text-slate-900">{formatCreatorName(expandedProject.createdBy)}</span>
                            </div>
                          </div>
                          
                          {/* Deactivate Project Action - Mobile */}
                          {expandedProject.isActive && (
                            <div className="mt-4 pt-3 border-t border-slate-200">
                              <button
                                type="button"
                                className="w-full rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
                                onClick={() => {
                                  setActivationTarget(expandedProject);
                                  setActivationIsActive(false);
                                  setActivationReason('');
                                  setActivationModalOpen(true);
                                }}
                              >
                                Deactivate Project
                              </button>
                            </div>
                          )}
                          
                          <div className="mt-4 pt-3 border-t border-slate-200">
                            <button
                              type="button"
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              onClick={() => setExpandedProjectId(null)}
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                {/* Desktop table layout */}
                <div className="hidden md:block">
                  <Table
                    columns={[
                      {
                        key: 'code',
                        title: 'Project Code',
                        render: (_v, p) => <span className="font-mono text-sm text-slate-900">{p.code}</span>
                      },
                      {
                        key: 'name',
                        title: 'Project Name',
                        render: (_v, p) => (
                          <button
                            type="button"
                            className="text-sm text-indigo-800 hover:underline"
                            onClick={() => {
                              toggleProjectExpansion(p.id);
                            }}
                          >
                            {p.name}
                          </button>
                        )
                      },
                      {
                        key: 'division',
                        title: 'Linked Division',
                        render: (_v, p) => <span className="text-sm text-slate-700">{linkedDivision(p)}</span>
                      },
                      {
                        key: 'status',
                        title: 'Status',
                        render: (_v, p) =>
                          p.isActive ? (
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
                        render: (_v, p) => <span className="text-sm text-slate-700">{createdOn(p)}</span>
                      },
                      {
                        key: 'action',
                        title: 'Action',
                        render: (_v, p) => (
                          <button
                            type="button"
                            className="text-sm font-medium text-indigo-800 hover:underline"
                            onClick={() => {
                              toggleProjectExpansion(p.id);
                            }}
                          >
                            {expandedProjectId === p.id ? 'Hide' : 'View'}
                          </button>
                        )
                      }
                    ]}
                    data={filteredItems.map((p) => ({
                      ...p,
                      code: p.code,
                      name: p.name,
                      division: linkedDivision(p),
                      status: p.isActive,
                      createdOn: createdOn(p),
                      action: p.id
                    }))}
                    empty="No projects found"
                  />
                </div>

                {/* Inline project details for desktop */}
                {expandedProjectId && expandedProject ? (
                  <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div>
                        <div className="text-base font-semibold text-slate-900">
                          Project Details
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          Work attribution and reporting context.
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                        onClick={() => setExpandedProjectId(null)}
                      >
                        Close
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Project Code</label>
                          <div className="mt-1 font-mono text-sm text-slate-900">{expandedProject.code}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Status</label>
                          <div className="mt-1">
                            {expandedProject.isActive ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700">Project Name</label>
                        <div className="mt-1 text-sm text-slate-900">{expandedProject.name}</div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700">Linked Division</label>
                        <div className="mt-1 text-sm text-slate-900">{linkedDivision(expandedProject)}</div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Created Date (YYYY-MM-DD)</label>
                          <div className="mt-1 text-sm text-slate-900">{projectCreatedOn(expandedProject)}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Created by</label>
                          <div className="mt-1 text-sm text-slate-900">{formatCreatorName(expandedProject.createdBy)}</div>
                        </div>
                      </div>

                      {/* Deactivate Project Action */}
                      {expandedProject.isActive && (
                        <div className="pt-6 border-t border-slate-200">
                          <button
                            type="button"
                            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 shadow-sm"
                            onClick={() => {
                              setActivationTarget(expandedProject);
                              setActivationIsActive(false);
                              setActivationReason('');
                              setActivationModalOpen(true);
                            }}
                          >
                            Deactivate Project
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        {activationModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (updateMutation.status === 'loading') return;
              setActivationModalOpen(false);
              setActivationTarget(null);
              setActivationReason('');
            }}
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">
              {activationIsActive ? 'Activate Project' : 'Deactivate Project'}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {activationIsActive ? (
                activationTarget ? (
                  <span>
                    {activationTarget.code} — {activationTarget.name}
                  </span>
                ) : null
              ) : (
                <span>Deactivating a project stops further usage. This action is audited.</span>
              )}
            </div>

            {!activationIsActive && activationTarget && (
              <div className="mt-2 text-sm text-slate-700">
                <strong>Project:</strong> {activationTarget.code} — {activationTarget.name}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">
                {activationIsActive ? 'Reason (required)' : 'Reason for deactivation (required)'}
              </label>
              <textarea
                className="mt-1 w-full h-28 rounded-md border-slate-300 text-sm"
                value={activationReason}
                onChange={(e) => setActivationReason(e.target.value)}
                placeholder={activationIsActive ? "Explain why this activation change is needed" : "Enter reason for deactivation (minimum 10 characters)"}
              />
              {activationReason.trim().length > 0 && activationReason.trim().length < 10 ? (
                <div className="mt-1 text-xs text-rose-700">Reason must be at least 10 characters.</div>
              ) : null}
              {activationReason.trim().length === 0 ? (
                <div className="mt-1 text-xs text-rose-700">Reason is required.</div>
              ) : null}
            </div>

            {updateMutation.status === 'error' ? (
              <div className="mt-3">
                <ErrorState error={updateMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={updateMutation.status === 'loading'}
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
                className={`rounded-md px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400 ${
                  activationIsActive 
                    ? 'bg-slate-900 hover:bg-black' 
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
                disabled={updateMutation.status === 'loading' || activationReason.trim().length === 0 || activationReason.trim().length < 10 || !activationTarget}
                onClick={async () => {
                  await updateMutation.run({
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
                {updateMutation.status === 'loading' ? 'Saving…' : (activationIsActive ? 'Confirm' : 'Confirm Deactivate')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Create Project Modal */}
      {createModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (createMutation.status === 'loading') return;
              setCreateModalOpen(false);
            }}
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">
              Create Project
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Add a new project to track work attribution and reporting context.
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!isCreateFormValid()) return;
                
                try {
                  await createMutation.run();
                  // Close modal and clear form on success
                  setCreateModalOpen(false);
                  setCode('');
                  setName('');
                  setCreateReason('');
                  // Refresh the list
                  list.refresh();
                } catch (error) {
                  // Error is handled by the mutation state
                  console.error('Create project failed:', error);
                }
              }}
            >
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Division</label>
                  <select
                    className="mt-1 w-full rounded-md border-slate-300 text-sm"
                    value={divisionId}
                    onChange={(e) => setDivisionId(e.target.value)}
                  >
                    <option value="">Select division</option>
                    {divisionOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Project Code</label>
                  <input
                    className="mt-1 w-full rounded-md border-slate-300 text-sm"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="PROJ001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Project Name</label>
                  <input
                    className="mt-1 w-full rounded-md border-slate-300 text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Project name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Reason</label>
                  <textarea
                    className="mt-1 w-full h-20 rounded-md border-slate-300 text-sm"
                    value={createReason}
                    onChange={(e) => setCreateReason(e.target.value)}
                    placeholder="Why create this project?"
                  />
                </div>
              </div>

              {createMutation.status === 'error' ? (
                <div className="mt-3">
                  <ErrorState error={createMutation.error} />
                </div>
              ) : null}

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                  disabled={createMutation.status === 'loading'}
                  onClick={() => {
                    setCreateModalOpen(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                  disabled={createMutation.status === 'loading' || !isCreateFormValid()}
                >
                  {createMutation.status === 'loading' ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          className="w-full sm:w-auto rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <div className="text-sm text-slate-600">Page {page}</div>
        <button
          type="button"
          className="w-full sm:w-auto rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
          disabled={page * pageSize >= total}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
