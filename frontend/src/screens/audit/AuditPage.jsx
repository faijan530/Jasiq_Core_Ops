import React, { useMemo, useState, useEffect } from 'react';

import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { apiFetch, getApiBaseUrl, getAuthToken } from '../../api/client.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

function buildPath(filters) {
  const u = new URL('/api/v1/governance/audit', getApiBaseUrl());
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === '' || v === 'undefined') continue;
    u.searchParams.set(k, String(v));
  }
  return u.pathname + u.search;
}

function getSeverityBarColor(severity) {
  const s = String(severity || 'MEDIUM').toUpperCase();
  if (s === 'CRITICAL') return 'bg-rose-600';
  if (s === 'HIGH') return 'bg-red-500';
  if (s === 'MEDIUM') return 'bg-amber-500';
  return 'bg-slate-400';
}

function getSeverityTextColor(severity) {
  const s = String(severity || 'MEDIUM').toUpperCase();
  if (s === 'CRITICAL') return 'text-rose-700';
  if (s === 'HIGH') return 'text-red-700';
  if (s === 'MEDIUM') return 'text-amber-700';
  return 'text-slate-700';
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

  const permissions = bootstrap?.rbac?.permissions || [];
  const canExport = permissions.includes('GOV_AUDIT_EXPORT') || permissions.includes('SYSTEM_FULL_ACCESS');
  const hasRead = permissions.includes('GOV_AUDIT_READ') || permissions.includes('SYSTEM_FULL_ACCESS');
  // Debug: uncomment to see permissions in console
  console.log('Audit permissions:', { permissions, canExport, hasRead });

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Filter states
  const [createdFrom, setCreatedFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [createdTo, setCreatedTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [action, setAction] = useState('');
  const [severity, setSeverity] = useState('');
  const [scope, setScope] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [actorId, setActorId] = useState('');
  const [requestId, setRequestId] = useState('');
  const [reasonContains, setReasonContains] = useState('');

  // Detail drawer state
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [timelineStatus, setTimelineStatus] = useState('idle');
  const [timelineError, setTimelineError] = useState(null);
  const [timelineItems, setTimelineItems] = useState([]);

  const [exportStatus, setExportStatus] = useState('idle');
  const [exportError, setExportError] = useState(null);

  // Debounced filter application
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [createdFrom, createdTo, entityType, entityId, action, severity, scope, divisionId, actorId, requestId, reasonContains]);

  const path = useMemo(() => {
    const filters = {};
    if (entityType) filters.entityType = entityType;
    if (entityId) filters.entityId = entityId;
    if (action) filters.action = action;
    if (severity) filters.severity = severity;
    if (scope) filters.scope = scope;
    if (divisionId) filters.divisionId = divisionId;
    if (actorId) filters.actorId = actorId;
    if (requestId) filters.requestId = requestId;
    if (reasonContains) filters.reasonContains = reasonContains;
    if (createdFrom) filters.createdFrom = `${createdFrom}T00:00:00.000Z`;
    if (createdTo) filters.createdTo = `${createdTo}T23:59:59.999Z`;
    return buildPath(filters);
  }, [createdFrom, createdTo, entityType, entityId, action, severity, scope, divisionId, actorId, requestId, reasonContains]);

  const list = usePagedQuery({ path: path || '/api/v1/governance/audit', page, pageSize, enabled: true });

  const items = list.data?.items || [];
  const total = list.data?.total || 0;

  // Get active filters for display
  const activeFilters = useMemo(() => {
    const filters = [];
    if (createdFrom || createdTo) filters.push({ label: `Range: ${createdFrom || '…'} → ${createdTo || '…'}`, key: 'createdRange' });
    if (entityType) filters.push({ label: `Entity: ${entityType}`, key: 'entityType' });
    if (entityId) filters.push({ label: `Entity ID: ${entityId}`, key: 'entityId' });
    if (action) filters.push({ label: `Action: ${action}`, key: 'action' });
    if (severity) filters.push({ label: `Severity: ${severity}`, key: 'severity' });
    if (scope) filters.push({ label: `Scope: ${scope}`, key: 'scope' });
    if (divisionId) filters.push({ label: `Division: ${divisionId}`, key: 'divisionId' });
    if (actorId) filters.push({ label: `Actor: ${actorId}`, key: 'actorId' });
    if (requestId) filters.push({ label: `Request: ${requestId}`, key: 'requestId' });
    if (reasonContains) filters.push({ label: `Reason: ${reasonContains}`, key: 'reasonContains' });
    return filters;
  }, [createdFrom, createdTo, entityType, entityId, action, severity, scope, divisionId, actorId, requestId, reasonContains]);

  const handleRowClick = (audit) => {
    setSelectedAudit(audit);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedAudit(null);
    setTimelineStatus('idle');
    setTimelineError(null);
    setTimelineItems([]);
  };

  const removeFilter = (key) => {
    switch (key) {
      case 'createdRange':
        setCreatedFrom('');
        setCreatedTo('');
        break;
      case 'entityType': setEntityType(''); break;
      case 'entityId': setEntityId(''); break;
      case 'action': setAction(''); break;
      case 'severity': setSeverity(''); break;
      case 'scope': setScope(''); break;
      case 'divisionId': setDivisionId(''); break;
      case 'actorId': setActorId(''); break;
      case 'requestId': setRequestId(''); break;
      case 'reasonContains': setReasonContains(''); break;
    }
  };

  useEffect(() => {
    let alive = true;
    async function loadTimeline() {
      if (!drawerOpen || !selectedAudit?.entityType || !selectedAudit?.entityId) return;
      try {
        setTimelineStatus('loading');
        setTimelineError(null);
        const payload = await apiFetch(
          `/api/v1/governance/audit/timeline?entityType=${encodeURIComponent(selectedAudit.entityType)}&entityId=${encodeURIComponent(selectedAudit.entityId)}&page=1&pageSize=50`
        );
        if (!alive) return;
        setTimelineItems(payload?.items || []);
        setTimelineStatus('ready');
      } catch (e) {
        if (!alive) return;
        setTimelineError(e);
        setTimelineStatus('error');
      }
    }
    loadTimeline();
    return () => {
      alive = false;
    };
  }, [drawerOpen, selectedAudit?.entityType, selectedAudit?.entityId]);

  const handleExport = async () => {
    if (!canExport) return;
    setExportStatus('loading');
    setExportError(null);
    try {
      const body = {
        from: createdFrom ? `${createdFrom}T00:00:00.000Z` : null,
        to: createdTo ? `${createdTo}T23:59:59.999Z` : null,
        format: 'CSV',
        entityType: entityType || null,
        entityId: entityId || null,
        action: action || null,
        divisionId: divisionId || null,
        severity: severity || null,
        reasonContains: reasonContains || null,
      };
      const data = await apiFetch('/api/v1/governance/audit/export', {
        method: 'POST',
        body,
      });
      if (data.downloadUrl) {
        // Download using authenticated request (Bearer token). Navigation drops headers and can cause 401.
        const base = getApiBaseUrl();
        const url = data.downloadUrl.startsWith('http')
          ? data.downloadUrl
          : `${String(base).replace(/\/$/, '')}${data.downloadUrl}`;

        const token = getAuthToken();
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            ...(token ? { authorization: `Bearer ${token}` } : {})
          }
        });
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);

        const blob = await res.blob();
        const objectUrl = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = data.fileName || 'audit_export.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();

        window.URL.revokeObjectURL(objectUrl);
      } else {
        throw new Error('No download URL returned');
      }
      setExportStatus('success');
    } catch (e) {
      setExportError(e);
      setExportStatus('error');
    }
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
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl shadow-xl mb-4">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Audit Logs
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Every critical action, permanently recorded with full traceability
        </p>
      </div>

      {/* Enhanced Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Filter Audit Logs</h2>
            <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
              <span className="text-sm font-medium text-slate-700">{total} total</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">From</label>
              <input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">To</label>
              <input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Entity Type</label>
              <input value={entityType} onChange={(e) => setEntityType(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" placeholder="EXPENSE / PAYROLL_RUN" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Entity ID</label>
              <input value={entityId} onChange={(e) => setEntityId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" placeholder="UUID" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Action</label>
              <input value={action} onChange={(e) => setAction(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" placeholder="CREATE / UPDATE / CLOSE" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm">
                <option value="">All</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Scope</label>
              <input value={scope} onChange={(e) => setScope(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" placeholder="SYSTEM / USER / API" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Division ID</label>
              <input value={divisionId} onChange={(e) => setDivisionId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" placeholder="UUID" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Actor ID</label>
              <input value={actorId} onChange={(e) => setActorId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" placeholder="UUID" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Request ID</label>
              <input value={requestId} onChange={(e) => setRequestId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" placeholder="x-request-id" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reason contains</label>
              <input value={reasonContains} onChange={(e) => setReasonContains(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" placeholder="text" />
            </div>

            {canExport ? (
              <div className="ml-auto">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Export</label>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exportStatus === 'loading'}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold shadow hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
                >
                  {exportStatus === 'loading' ? 'Exporting…' : 'Export CSV'}
                </button>
                {exportError ? <div className="text-xs text-rose-700 mt-1">{String(exportError.message || exportError)}</div> : null}
              </div>
            ) : (
              <div className="ml-auto">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Export</label>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 text-slate-500 text-sm font-semibold cursor-not-allowed"
                  title="Export requires GOV_AUDIT_EXPORT or SYSTEM_FULL_ACCESS permission"
                >
                  Export CSV
                </button>
                <div className="text-xs text-slate-500 mt-1">Permission required</div>
              </div>
            )}
          </div>

            {/* Enhanced Active Filters */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-200">
                {activeFilters.map((filter) => (
                  <span
                    key={filter.key}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-full leading-none shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    {filter.label}
                    <button
                      type="button"
                      className="text-amber-400 hover:text-amber-600 leading-none transition-colors duration-200 hover:scale-110 transform"
                      onClick={() => removeFilter(filter.key)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

       {/* Enhanced Forensic Timeline */}
       <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
         <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 px-6 py-4 border-b border-slate-200">
           <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Forensic Timeline</h2>
            <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
              <span className="text-sm font-medium text-slate-700">{items.length} entries</span>
            </div>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="p-8">
            <EmptyState title="No audit logs found" description="Try adjusting your filters to see more results." />
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {items.map((audit) => {
              const actorInfo = formatActorId(audit.actorId);
              const severityColor = getSeverityBarColor(audit.severity);
              const timestampInfo = formatAuditTime(audit.createdAt ?? audit.created_at);
              const entityInfo = formatEntity(audit.entityType, audit.entityId, audit.action);

              return (
                <div
                  key={audit.id}
                  className="relative hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(audit)}
                >
                  {/* Severity Bar - 3px width */}
                  <div className={`absolute left-0 top-0 h-full w-1 ${severityColor}`} />
                  
                  <div className="p-5 pl-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Time - monospace, muted */}
                        <div className="font-mono text-xs text-slate-500 mb-3" title={timestampInfo.iso}>
                          {timestampInfo.display}
                        </div>
                        
                        {/* Action and Entity - improved hierarchy */}
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`font-semibold ${getSeverityTextColor(audit.severity)}`}>{String(audit.severity || 'MEDIUM').toUpperCase()}</span>
                          <span className="text-sm font-medium text-slate-700">{String(audit.action || '').toUpperCase() || '—'}</span>
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {entityInfo.display}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{actorInfo.name}</div>
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

      {/* Enhanced Pagination */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-105 disabled:scale-100"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </div>
          </button>
          <div className="text-center">
            <div className="text-sm font-medium text-slate-900">Page {page}</div>
            <div className="text-xs text-slate-500">{total} total entries</div>
          </div>
          <button
            type="button"
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-105 disabled:scale-100"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            <div className="flex items-center gap-2">
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
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
                <div className="font-medium text-slate-900">{String(selectedAudit.action || '').toUpperCase() || '—'}</div>
                <div className={`text-sm mt-1 font-semibold ${getSeverityTextColor(selectedAudit.severity)}`}>{String(selectedAudit.severity || 'MEDIUM').toUpperCase()}</div>
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
              {selectedAudit?.meta?.ip && (
                <div className="pb-4 border-b border-slate-100">
                  <div className="text-sm font-medium text-slate-500 mb-1">IP Address</div>
                  <div className="font-mono text-sm text-slate-900">{String(selectedAudit.meta.ip)}</div>
                </div>
              )}

              {/* Device (if available) */}
              {selectedAudit?.meta?.userAgent && (
                <div className="pb-4 border-b border-slate-100">
                  <div className="text-sm font-medium text-slate-500 mb-1">Device</div>
                  <div className="text-sm text-slate-900">{String(selectedAudit.meta.userAgent)}</div>
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
              {(selectedAudit.beforeData || selectedAudit.afterData) && (
                <div className="pb-4">
                  <div className="text-sm font-medium text-slate-500 mb-3">State Changes</div>
                  
                  {selectedAudit.beforeData && (
                    <div className="mb-4">
                      <div className="text-xs font-medium text-slate-500 mb-2">Before</div>
                      <pre className="bg-slate-50 p-3 rounded-md text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(selectedAudit.beforeData, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {selectedAudit.afterData && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-2">After</div>
                      <pre className="bg-slate-50 p-3 rounded-md text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(selectedAudit.afterData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline */}
              <div className="pb-4">
                <div className="text-sm font-medium text-slate-500 mb-3">Entity Timeline</div>
                {!selectedAudit?.entityType || !selectedAudit?.entityId ? (
                  <div className="text-sm text-slate-600">Timeline not available for this event (missing entity reference).</div>
                ) : timelineStatus === 'loading' ? (
                  <div className="text-sm text-slate-600">Loading timeline…</div>
                ) : timelineStatus === 'error' ? (
                  <div className="text-sm text-rose-700">{String(timelineError?.message || timelineError || 'Failed to load timeline')}</div>
                ) : timelineItems.length === 0 ? (
                  <div className="text-sm text-slate-600">No timeline events.</div>
                ) : (
                  <div className="space-y-2">
                    {timelineItems.slice(0, 10).map((t) => (
                      <div key={t.id} className="rounded-lg border border-slate-200 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900">{String(t.action || '').toUpperCase()}</div>
                          <div className={`text-xs font-semibold ${getSeverityTextColor(t.severity)}`}>{String(t.severity || 'MEDIUM').toUpperCase()}</div>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">{formatDisplayTime(t.createdAt ?? t.created_at)}</div>
                        {t.reason ? <div className="text-xs text-slate-700 mt-1">{String(t.reason)}</div> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
