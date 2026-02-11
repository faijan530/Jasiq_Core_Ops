import React, { useMemo, useState, useEffect } from 'react';

import { PageHeader } from '../../components/PageHeader.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

const ACTOR_OPTIONS = [
  { label: 'Admin', value: '00000000-0000-0000-0000-000000000001' },
  { label: 'System', value: 'system' },
  { label: 'Service Account', value: 'service-account' }
];

const MODULE_OPTIONS = [
  { label: 'Finance', value: 'finance' },
  { label: 'Payroll', value: 'payroll' },
  { label: 'Attendance', value: 'attendance' },
  { label: 'Governance', value: 'governance' },
  { label: 'System', value: 'system' }
];

const ACTION_TYPE_OPTIONS = [
  { label: 'Open', value: 'open' },
  { label: 'Locked', value: 'locked' },
  { label: 'Closed', value: 'closed' },
  { label: 'Read-only', value: 'read-only' }
];

function buildPath(filters) {
  const u = new URL('/api/v1/governance/audit', 'http://local');
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === '' || v === 'undefined') continue;
    u.searchParams.set(k, String(v));
  }
  return u.pathname + u.search;
}

function mapActionToLabel(action) {
  const actionMap = {
    'CREATE': 'Open',
    'UPDATE': 'Read-only',
    'ADMIN_LOGIN': 'Read-only',
    'LOCK': 'Locked',
    'CLOSE': 'Closed'
  };
  return actionMap[action] || 'Read-only';
}

function getActionColor(action) {
  const label = mapActionToLabel(action);
  switch (label) {
    case 'Closed': return 'text-red-700';
    case 'Locked': return 'text-amber-700';
    case 'Open': return 'text-slate-700';
    case 'Read-only': return 'text-slate-700';
    default: return 'text-slate-700';
  }
}

function getSeverityBarColor(action) {
  const label = mapActionToLabel(action);
  switch (label) {
    case 'Closed': return 'bg-red-500';
    case 'Locked': return 'bg-amber-500';
    case 'Open': return 'bg-slate-400';
    case 'Read-only': return 'bg-slate-400';
    default: return 'bg-slate-400';
  }
}

function formatActorId(id) {
  if (!id) return { name: 'System', role: 'System', id: 'system' };
  if (id === '00000000-0000-0000-0000-000000000001') return { name: 'Admin', role: 'Administrator', id: id };
  if (id === 'system') return { name: 'System', role: 'System', id: 'system' };
  if (id === 'service-account') return { name: 'Service Account', role: 'Service', id: 'service-account' };
  
  // Check if it's a UUID format
  if (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
    return { name: 'User', role: 'User', id: id };
  }
  
  // For any other format, use the ID as name but avoid duplication
  const displayName = id.includes('user') ? 'User' : id;
  return { name: displayName, role: 'User', id: id };
}

function formatEntity(entityType, entityId, action = '') {
  if (!entityType) return { display: '—', id: null };
  
  // Convert internal enums to human-readable titles
  let moduleTitle = '';
  switch (entityType.toLowerCase()) {
    case 'admin_user':
      moduleTitle = 'Admin User';
      break;
    case 'user':
      moduleTitle = 'User';
      break;
    case 'division':
      moduleTitle = 'Division';
      break;
    case 'project':
      moduleTitle = 'Project';
      break;
    case 'month_close':
      moduleTitle = 'Month Close';
      break;
    case 'attendance':
      moduleTitle = 'Attendance';
      break;
    case 'payroll':
      moduleTitle = 'Payroll';
      break;
    case 'finance':
      moduleTitle = 'Finance';
      break;
    case 'governance':
      moduleTitle = 'Governance';
      break;
    case 'system':
      moduleTitle = 'System';
      break;
    default:
      moduleTitle = entityType.charAt(0).toUpperCase() + entityType.slice(1);
  }
  
  // Map actions to readable context
  let actionContext = '';
  switch (action?.toLowerCase()) {
    case 'create':
    case 'open':
      actionContext = 'Creation Event';
      break;
    case 'update':
    case 'read-only':
      actionContext = 'Modification Event';
      break;
    case 'lock':
    case 'locked':
      actionContext = 'Lock Event';
      break;
    case 'close':
    case 'closed':
      actionContext = 'Closure Event';
      break;
    case 'admin_login':
      actionContext = 'Login Event';
      break;
    case 'delete':
    case 'deactivate':
      actionContext = 'Deletion Event';
      break;
    case 'activate':
      actionContext = 'Activation Event';
      break;
    default:
      actionContext = action ? `${action.charAt(0).toUpperCase() + action.slice(1)} Event` : 'Event';
  }
  
  const display = `${moduleTitle} · ${actionContext}`;
  
  return { 
    display, 
    id: entityId || null,
    module: moduleTitle,
    actionContext
  };
}

function formatAuditTime(value) {
  if (!value) return { display: "—", iso: "" };

  let s = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    s = s.replace(" ", "T");
  }

  const date = new Date(s);
  if (Number.isNaN(date.getTime())) return { display: String(value), iso: String(value) };

  // Human-readable format: "09 Feb 2026 · 07:43:17 UTC"
  const display = date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  }).replace(',', ' ·') + ' UTC';

  return { display, iso: date.toISOString() };
}

function formatDisplayTime(value) {
  return formatAuditTime(value).display;
}

export function AuditPage() {
  const { bootstrap } = useBootstrap();
  const title = 'Audit Logs';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Filter states
  const [dateRange, setDateRange] = useState('7'); // last 7 days default
  const [actor, setActor] = useState('');
  const [module, setModule] = useState('');
  const [actionType, setActionType] = useState('');
  const [entityReference, setEntityReference] = useState('');

  // Detail drawer state
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const actorBlocked = actor === 'system' || actor === 'service-account';

  // Debounced filter application
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [dateRange, actor, module, actionType, entityReference]);

  const path = useMemo(() => {
    if (actorBlocked) return '';
    const filters = {};
    if (module) filters.entityType = module;
    if (entityReference) filters.entityId = entityReference;
    if (actor) filters.actorId = actor;
    // Map UI action types back to backend actions
    if (actionType) {
      const backendActionMap = {
        'open': 'CREATE',
        'read-only': 'UPDATE',
        'locked': 'LOCK',
        'closed': 'CLOSE'
      };
      filters.action = backendActionMap[actionType];
    }
    if (dateRange) {
      const days = parseInt(dateRange);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      filters.startDate = startDate.toISOString().split('T')[0];
      filters.endDate = endDate.toISOString().split('T')[0];
    }
    return buildPath(filters);
  }, [dateRange, actor, module, actionType, entityReference, actorBlocked]);

  const list = usePagedQuery({ path: path || '/api/v1/governance/audit', page, pageSize, enabled: !!path && !actorBlocked });

  const items = list.data?.items || [];
  const total = list.data?.total || 0;

  // Get active filters for display
  const activeFilters = useMemo(() => {
    const filters = [];
    if (dateRange) filters.push({ label: `Last ${dateRange} days`, key: 'dateRange' });
    if (actor) {
      const actorOption = ACTOR_OPTIONS.find(o => o.value === actor);
      if (actorOption) filters.push({ label: `Actor: ${actorOption.label}`, key: 'actor' });
    }
    if (module) {
      const moduleOption = MODULE_OPTIONS.find(o => o.value === module);
      if (moduleOption) filters.push({ label: `Module: ${moduleOption.label}`, key: 'module' });
    }
    if (actionType) {
      const actionOption = ACTION_TYPE_OPTIONS.find(o => o.value === actionType);
      if (actionOption) filters.push({ label: `Action: ${actionOption.label}`, key: 'actionType' });
    }
    if (entityReference) filters.push({ label: `Reference: ${entityReference}`, key: 'entityReference' });
    return filters;
  }, [dateRange, actor, module, actionType, entityReference]);

  const handleRowClick = (audit) => {
    setSelectedAudit(audit);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedAudit(null);
  };

  const removeFilter = (key) => {
    switch (key) {
      case 'dateRange': setDateRange(''); break;
      case 'actor': setActor(''); break;
      case 'module': setModule(''); break;
      case 'actionType': setActionType(''); break;
      case 'entityReference': setEntityReference(''); break;
    }
  };

  if (list.status === 'loading' && !list.data) {
    return (
      <div className="min-h-screen bg-slate-100">
        {/* Global Header - matching other pages */}
        <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
          <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <img 
                  src="/image.png" 
                  alt="JASIQ" 
                  className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
                />
                <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
              </div>
              <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
                <span className="text-white">Governance</span>
                <span className="mx-2">·</span>
                <span className="text-amber-400">Audit Logs</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-32 sm:pt-32 lg:pt-16">
          <PageHeader title={title} subtitle="Every critical action, permanently recorded" />
          <LoadingState />
        </div>
      </div>
    );
  }

  if (list.status === 'error') {
    if (list.error?.status === 403) {
      return (
        <div className="min-h-screen bg-slate-100">
          {/* Global Header */}
          <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
            <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <img 
                    src="/image.png" 
                    alt="JASIQ" 
                    className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
                  />
                  <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
                </div>
                <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
                  <span className="text-white">Governance</span>
                  <span className="mx-2">·</span>
                  <span className="text-amber-400">Audit Logs</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-32 sm:pt-32 lg:pt-16">
            <PageHeader title={title} subtitle="Every critical action, permanently recorded" />
            <ForbiddenState />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-100">
        {/* Global Header */}
        <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
          <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <img 
                  src="/image.png" 
                  alt="JASIQ" 
                  className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
                />
                <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
              </div>
              <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
                <span className="text-white">Governance</span>
                <span className="mx-2">·</span>
                <span className="text-amber-400">Audit Logs</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-32 sm:pt-32 lg:pt-16">
          <PageHeader title={title} subtitle="Every critical action, permanently recorded" />
          <ErrorState error={list.error} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Global Header */}
      <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
        <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <img 
                src="/image.png" 
                alt="JASIQ" 
                className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
              />
              <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
            </div>
            <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
              <span className="text-white">Governance</span>
              <span className="mx-2">·</span>
              <span className="text-amber-400">Audit Logs</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-32 sm:pt-32 lg:pt-16">
        <PageHeader title={title} subtitle="Every critical action, permanently recorded" />

        {/* Compact Filter Bar */}
        <div className="mx-4 mb-4 md:mx-6 lg:mx-8">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Range Dropdown */}
              <div className="relative">
                <select
                  className="px-4 py-3 h-11 w-full bg-white border-2 border-gray-500 rounded-md text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-none appearance-none pr-12 cursor-pointer hover:border-gray-600 transition-colors duration-150"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="">All dates</option>
                  <option value="1">Last 24 hours</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L6 6L11 1" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>

              {/* Actor Dropdown */}
              <div className="relative">
                <select
                  className="px-4 py-3 h-11 w-full bg-white border border-gray-400 rounded-md text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-none appearance-none pr-12 cursor-pointer hover:border-gray-500 transition-colors duration-150"
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                >
                  <option value="">All actors</option>
                  {ACTOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L6 6L11 1" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>

              {/* Module Dropdown */}
              <div className="relative">
                <select
                  className="px-4 py-3 h-11 w-full bg-white border border-gray-400 rounded-md text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-none appearance-none pr-12 cursor-pointer hover:border-gray-500 transition-colors duration-150"
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                >
                  <option value="">All modules</option>
                  {MODULE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L6 6L11 1" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>

              {/* Action Type Dropdown */}
              <div className="relative">
                <select
                  className="px-4 py-3 h-11 w-full bg-white border border-gray-400 rounded-md text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-none appearance-none pr-12 cursor-pointer hover:border-gray-500 transition-colors duration-150"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                >
                  <option value="">All actions</option>
                  {ACTION_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L6 6L11 1" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>

              <input
                type="text"
                className="px-4 py-3 h-11 bg-white border border-gray-400 rounded-md text-sm text-gray-800 font-medium placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-none hover:border-gray-500 transition-colors duration-150"
                placeholder="Entity reference"
                value={entityReference}
                onChange={(e) => setEntityReference(e.target.value)}
              />
            </div>

            {/* Active Filters */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-200">
                {activeFilters.map((filter) => (
                  <span
                    key={filter.key}
                    className="inline-flex items-center gap-2 px-3 py-2 h-11 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm rounded-md leading-none shadow-sm"
                  >
                    {filter.label}
                    <button
                      type="button"
                      className="text-indigo-400 hover:text-indigo-600 leading-none transition-colors duration-200"
                      onClick={() => removeFilter(filter.key)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Forensic Timeline */}
        <div className="mx-4 mb-6 md:mx-6 lg:mx-8">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            {items.length === 0 ? (
              <div className="p-8">
                <EmptyState title="No audit logs found" description="Try adjusting your filters to see more results." />
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {items.map((audit) => {
                  const actorInfo = formatActorId(audit.actorId);
                  const actionLabel = mapActionToLabel(audit.action);
                  const actionColor = getActionColor(audit.action);
                  const severityColor = getSeverityBarColor(audit.action);
                  const timestampInfo = formatAuditTime(audit.createdAt ?? audit.created_at);
                  const entityInfo = formatEntity(audit.entityType, audit.entityId, audit.action);

                  return (
                    <div
                      key={audit.id}
                      className="relative hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(audit)}
                    >
                      {/* Severity Bar - 3px width */}
                      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${severityColor}`} />
                      
                      <div className="p-5 pl-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Time - monospace, muted */}
                            <div className="font-mono text-xs text-slate-500 mb-3" title={timestampInfo.iso}>
                              {timestampInfo.display}
                            </div>
                            
                            {/* Actor - bold name, muted role */}
                            <div className="mb-3">
                              <div className="font-bold text-slate-900 text-base">{actorInfo.name}</div>
                              <div className="text-sm text-slate-500 mt-0.5">{actorInfo.role}</div>
                            </div>
                            
                            {/* Action and Entity - improved hierarchy */}
                            <div className="flex items-center gap-4 text-sm">
                              <span className={`font-semibold ${actionColor}`}>{actionLabel}</span>
                              <span className="text-slate-600">
                                {entityInfo.display}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="mx-4 mb-8 md:mx-6 lg:mx-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-2 h-10 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <div className="text-sm text-slate-600 font-medium">Page {page} / Total {total}</div>
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-2 h-10 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {drawerOpen && selectedAudit && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-25"
            onClick={closeDrawer}
          />
          
          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-full md:w-2/5 lg:w-2/5 xl:w-2/5 bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Audit Details</h3>
                <button
                  type="button"
                  className="text-slate-300 opacity-60"
                  onClick={closeDrawer}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Action */}
              <div className="pb-4 border-b border-slate-100">
                <div className="text-sm font-medium text-slate-500 mb-1">Action</div>
                <div className={`font-medium ${getActionColor(selectedAudit.action)}`}>
                  {mapActionToLabel(selectedAudit.action)}
                </div>
              </div>

              {/* Entity */}
              <div className="pb-4 border-b border-slate-100">
                <div className="text-sm font-medium text-slate-500 mb-1">Entity</div>
                <div className="text-slate-900 mb-3">
                  {formatEntity(selectedAudit.entityType, selectedAudit.entityId, selectedAudit.action).display}
                </div>
                {/* Reference ID as secondary info */}
                {formatEntity(selectedAudit.entityType, selectedAudit.entityId, selectedAudit.action).id && (
                  <div className="text-xs">
                    <div className="text-slate-500 mb-1">Reference ID</div>
                    <div className="font-mono bg-slate-50 p-2 rounded border border-slate-200 text-slate-700">
                      {formatEntity(selectedAudit.entityType, selectedAudit.entityId, selectedAudit.action).id}
                    </div>
                  </div>
                )}
              </div>

              {/* Actor */}
              <div className="pb-4 border-b border-slate-100">
                <div className="text-sm font-medium text-slate-500 mb-1">Actor</div>
                <div className="text-slate-900 mb-2">
                  <div className="font-medium">{formatActorId(selectedAudit.actorId).name}</div>
                  <div className="text-sm text-slate-500">Role: {formatActorId(selectedAudit.actorId).role}</div>
                </div>
                {/* Actor ID as secondary info */}
                {formatActorId(selectedAudit.actorId).id && formatActorId(selectedAudit.actorId).id !== formatActorId(selectedAudit.actorId).name && (
                  <div className="text-xs">
                    <div className="text-slate-500 mb-1">Actor ID</div>
                    <div className="font-mono bg-slate-50 p-2 rounded border border-slate-200 text-slate-700">
                      {formatActorId(selectedAudit.actorId).id}
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className="pb-4 border-b border-slate-100">
                <div className="text-sm font-medium text-slate-500 mb-1">Timestamp</div>
                <div className="font-mono text-sm text-slate-700" title={formatAuditTime(selectedAudit.createdAt ?? selectedAudit.created_at).iso}>
                  {formatAuditTime(selectedAudit.createdAt ?? selectedAudit.created_at).display}
                </div>
              </div>

              {/* IP Address (if available) */}
              {selectedAudit.ipAddress && (
                <div className="pb-4 border-b border-slate-100">
                  <div className="text-sm font-medium text-slate-500 mb-1">IP Address</div>
                  <div className="font-mono text-sm text-slate-900">{selectedAudit.ipAddress}</div>
                </div>
              )}

              {/* Device (if available) */}
              {selectedAudit.userAgent && (
                <div className="pb-4 border-b border-slate-100">
                  <div className="text-sm font-medium text-slate-500 mb-1">Device</div>
                  <div className="text-sm text-slate-900">{selectedAudit.userAgent}</div>
                </div>
              )}

              {/* Reason - Human readable */}
              {selectedAudit.reason && (
                <div className="pb-4 border-b border-slate-100">
                  <div className="text-sm font-medium text-slate-500 mb-1">Reason</div>
                  <div className="text-sm text-slate-900">{selectedAudit.reason}</div>
                </div>
              )}

              {/* Source - Technical reference */}
              {selectedAudit.source && (
                <div className="pb-4 border-b border-slate-100">
                  <div className="text-sm font-medium text-slate-500 mb-1">Source</div>
                  <div className="font-mono text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
                    {selectedAudit.source}
                  </div>
                </div>
              )}

              {/* JSON Diff */}
              {(selectedAudit.beforeState || selectedAudit.afterState) && (
                <div className="pb-4">
                  <div className="text-sm font-medium text-slate-500 mb-3">State Changes</div>
                  
                  {selectedAudit.beforeState && (
                    <div className="mb-4">
                      <div className="text-xs font-medium text-slate-500 mb-2">Before</div>
                      <pre className="bg-slate-50 p-3 rounded-md text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(JSON.parse(selectedAudit.beforeState), null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {selectedAudit.afterState && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-2">After</div>
                      <pre className="bg-slate-50 p-3 rounded-md text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(JSON.parse(selectedAudit.afterState), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Export Button - Enhanced primary styling with trust signal */}
              <div className="pt-4 border-t border-slate-200">
                <button
                  type="button"
                  className="w-full px-6 py-3 h-12 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-600 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-[1.02] disabled:scale-100"
                  disabled // TODO: Add permission check
                  title="Export requires additional permissions"
                >
                  Export Audit Logs
                </button>
                <p className="text-xs text-slate-500 mt-3 text-center leading-relaxed">
                  Exported audit logs are immutable and watermarked for compliance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
