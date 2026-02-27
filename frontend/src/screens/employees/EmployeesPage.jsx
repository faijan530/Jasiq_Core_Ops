import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch } from '../../api/client.js';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { getEmployeeAddPath, getEmployeeViewPath } from '../../utils/roleRouting.js';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function buildListPath({ divisionId, scope, status }) {
  const u = new URL('/api/v1/employees', 'http://local');
  if (divisionId) u.searchParams.set('divisionId', divisionId);
  if (scope) u.searchParams.set('scope', scope);
  if (status) u.searchParams.set('status', status);
  return u.pathname + u.search;
}

function initialsFromEmployee(e) {
  const fn = String(e?.firstName || '').trim();
  const ln = String(e?.lastName || '').trim();
  const a = fn ? fn[0] : '';
  const b = ln ? ln[0] : '';
  const s = (a + b).toUpperCase();
  return s || '—';
}

function Icon({ name, className }) {
  const common = {
    className: cx('h-4 w-4', className),
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg'
  };

  if (name === 'filter') {
    return (
      <svg {...common}>
        <path
          d="M3 5h18M6 12h12M10 19h4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'search') {
    return (
      <svg {...common}>
        <path
          d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'chevron') {
    return (
      <svg {...common}>
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'x') {
    return (
      <svg {...common}>
        <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'edit') {
    return (
      <svg {...common}>
        <path
          d="M12 20h9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'download') {
    return (
      <svg {...common}>
        <path
          d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return null;
}

function statusBadge(status) {
  const raw = String(status || '').toUpperCase();
  const label = raw === 'ACTIVE' ? 'Active' : raw === 'ON_HOLD' ? 'Locked' : raw === 'EXITED' ? 'Closed' : raw || '—';
  const cls =
    raw === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : raw === 'ON_HOLD'
        ? 'bg-amber-50 text-amber-800 ring-amber-200'
        : raw === 'EXITED'
          ? 'bg-rose-50 text-rose-700 ring-rose-200'
          : 'bg-slate-50 text-slate-700 ring-slate-200';
  return <span className={cx('inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset', cls)}>{label}</span>;
}

function scopeBadge(scope, divisionColor = null) {
  const s = String(scope || '').toUpperCase();
  if (s === 'COMPANY') {
    return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">Shared</span>;
  }
  if (s === 'DIVISION') {
    const color = divisionColor || '#3B82F6';
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full border" style={{ borderColor: color, color }}>
        DIVISION
      </span>
    );
  }
  return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">—</span>;
}

function formatName(e) {
  const fn = e?.firstName || '';
  const ln = e?.lastName || '';
  const full = `${fn} ${ln}`.trim();
  return full || '—';
}

function formatDivisionLabel(divisionsById, divisionId) {
  if (!divisionId) return '—';
  const d = divisionsById[divisionId];
  if (!d) return divisionId.slice(0, 8) + '…';
  return `${d.code} — ${d.name}`;
}

function FilterSection({ title, open, onToggle, children }) {
  return (
    <div className="border-t border-slate-100 pt-4">
      <button type="button" className="w-full flex items-center justify-between" onClick={onToggle}>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className={cx('transition-transform', open ? 'rotate-180' : '')}>
          <Icon name="chevron" className="text-slate-500" />
        </div>
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function FilterRadio({ label, checked, onChange, count, disabled = false }) {
  return (
    <button
      type="button"
      className={cx(
        'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm',
        disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50',
        checked ? 'bg-slate-100' : ''
      )}
      onClick={() => {
        if (disabled) return;
        onChange();
      }}
      disabled={disabled}
    >
      <div className="flex items-center gap-2">
        <span
          className={cx(
            'h-4 w-4 rounded-full border flex items-center justify-center',
            checked ? 'border-slate-900' : 'border-slate-300'
          )}
        >
          {checked ? <span className="h-2 w-2 rounded-full bg-slate-900" /> : null}
        </span>
        <span>{label}</span>
      </div>
      {typeof count === 'number' ? <span className="text-xs text-slate-500">{count}</span> : null}
    </button>
  );
}

export function EmployeesPage() {
  const { bootstrap } = useBootstrap();
  const title = bootstrap?.ui?.screens?.employees?.title || 'Employees';
  const navigate = useNavigate();

  const permissions = bootstrap?.rbac?.permissions || [];
  const hasSystemFullAccess = permissions.includes('SYSTEM_FULL_ACCESS');
  const canWrite = hasSystemFullAccess || permissions.includes('EMPLOYEE_WRITE');
  const canCompWrite = hasSystemFullAccess || permissions.includes('EMPLOYEE_COMPENSATION_WRITE');
  const canDocWrite = hasSystemFullAccess || permissions.includes('EMPLOYEE_DOCUMENT_WRITE');

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [divisionId, setDivisionId] = useState('');
  const [scope, setScope] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const divisions = usePagedQuery({ path: '/api/v1/governance/divisions', page: 1, pageSize: 200, enabled: true });

  const divisionsById = useMemo(() => {
    const items = divisions.data?.items || [];
    const map = {};
    for (const d of items) map[d.id] = d;
    return map;
  }, [divisions.data]);

  const list = usePagedQuery({
    path: buildListPath({ divisionId: divisionId || null, scope: scope || null, status: status || null }),
    page,
    pageSize,
    enabled: true
  });

  const items = list.data?.items || [];
  const total = list.data?.total || 0;

  const filteredBySearch = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((e) => {
      const code = String(e.employeeCode || '').toLowerCase();
      const nm = formatName(e).toLowerCase();
      return code.includes(q) || nm.includes(q);
    });
  }, [items, search]);

  const counts = useMemo(() => {
    const statusCounts = { ACTIVE: 0, ON_HOLD: 0, EXITED: 0 };
    const scopeCounts = { COMPANY: 0, DIVISION: 0 };
    const divisionCounts = {};
    for (const e of items) {
      if (e.status && statusCounts[e.status] !== undefined) statusCounts[e.status] += 1;
      if (e.scope && scopeCounts[e.scope] !== undefined) scopeCounts[e.scope] += 1;
      const did = e.primaryDivisionId || '';
      if (did) divisionCounts[did] = (divisionCounts[did] || 0) + 1;
    }
    return { statusCounts, scopeCounts, divisionCounts };
  }, [items]);

  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  const [detailState, setDetailState] = useState({ status: 'idle', data: null, error: null, refreshIndex: 0 });
  const refreshDetail = () => setDetailState((s) => ({ ...s, refreshIndex: s.refreshIndex + 1 }));

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!selectedId) {
        setDetailState((s) => ({ ...s, status: 'idle', data: null, error: null }));
        return;
      }

      setDetailState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        const payload = await apiFetch(`/api/v1/employees/${selectedId}`);
        if (!alive) return;
        setDetailState((s) => ({ ...s, status: 'ready', data: payload, error: null }));
      } catch (err) {
        if (!alive) return;
        setDetailState((s) => ({ ...s, status: 'error', error: err }));
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [selectedId, detailState.refreshIndex]);

  const selected = detailState.data?.item || null;
  const selectedExited = selected?.status === 'EXITED';

  const [compState, setCompState] = useState({ status: 'idle', data: null, error: null, refreshIndex: 0 });
  const refreshComp = () => setCompState((s) => ({ ...s, refreshIndex: s.refreshIndex + 1 }));

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!selectedId || activeTab !== 'compensation') {
        return;
      }

      setCompState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        const payload = await apiFetch(`/api/v1/employees/${selectedId}/compensation`);
        if (!alive) return;
        setCompState((s) => ({ ...s, status: 'ready', data: payload, error: null }));
      } catch (err) {
        if (!alive) return;
        setCompState((s) => ({ ...s, status: 'error', error: err }));
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [selectedId, activeTab, compState.refreshIndex]);

  const [docState, setDocState] = useState({ status: 'idle', data: null, error: null, refreshIndex: 0 });
  const refreshDocs = () => setDocState((s) => ({ ...s, refreshIndex: s.refreshIndex + 1 }));

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!selectedId || activeTab !== 'documents') {
        return;
      }

      setDocState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        const payload = await apiFetch(`/api/v1/employees/${selectedId}/documents`);
        if (!alive) return;
        setDocState((s) => ({ ...s, status: 'ready', data: payload, error: null }));
      } catch (err) {
        if (!alive) return;
        setDocState((s) => ({ ...s, status: 'error', error: err }));
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [selectedId, activeTab, docState.refreshIndex]);

  const createMutation = useMutation(async (payload) => {
    return apiFetch('/api/v1/employees', { method: 'POST', body: payload, headers: payload?.idempotencyKey ? { 'x-idempotency-key': payload.idempotencyKey } : undefined });
  });

  const updateMutation = useMutation(async ({ id, payload }) => {
    return apiFetch(`/api/v1/employees/${id}`, { method: 'PATCH', body: payload });
  });

  const changeScopeMutation = useMutation(async ({ id, payload }) => {
    return apiFetch(`/api/v1/employees/${id}/change-scope`, { method: 'POST', body: payload });
  });

  const changeStatusMutation = useMutation(async ({ id, payload }) => {
    return apiFetch(`/api/v1/employees/${id}/change-status`, { method: 'POST', body: payload });
  });

  const addCompMutation = useMutation(async ({ id, payload }) => {
    return apiFetch(`/api/v1/employees/${id}/compensation`, { method: 'POST', body: payload });
  });

  const uploadDocMutation = useMutation(async ({ id, payload }) => {
    return apiFetch(`/api/v1/employees/${id}/documents`, { method: 'POST', body: payload });
  });

  const downloadDocMutation = useMutation(async ({ id, docId }) => {
    return apiFetch(`/api/v1/employees/${id}/documents/${docId}/download`);
  });

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [employeeModalMode, setEmployeeModalMode] = useState('create');
  const [formEmployeeCode, setFormEmployeeCode] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [formScope, setFormScope] = useState('COMPANY');
  const [formPrimaryDivisionId, setFormPrimaryDivisionId] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formIdempotencyKey, setFormIdempotencyKey] = useState('');

  const openCreateEmployee = () => {
    setEmployeeModalMode('create');
    setFormEmployeeCode('');
    setFormFirstName('');
    setFormLastName('');
    setFormEmail('');
    setFormPhone('');
    setFormStatus('ACTIVE');
    setFormScope('COMPANY');
    setFormPrimaryDivisionId('');
    setFormReason('');
    setFormIdempotencyKey('');
    setEmployeeModalOpen(true);
  };

  const autoOpenedRef = useRef(false);
  // Auto-open modal functionality removed - now using page-based flow

  const openEditEmployeeFromEmployee = (e) => {
    if (!e) return;
    setEmployeeModalMode('edit');
    setFormEmployeeCode(e.employeeCode || '');
    setFormFirstName(e.firstName || '');
    setFormLastName(e.lastName || '');
    setFormEmail(e.email || '');
    setFormPhone(e.phone || '');
    setFormStatus(e.status || 'ACTIVE');
    setFormScope(e.scope || 'COMPANY');
    setFormPrimaryDivisionId(e.primaryDivisionId || '');
    setFormReason('');
    setFormIdempotencyKey('');
    setEmployeeModalOpen(true);
  };

  const openEditEmployee = () => {
    if (!selected) return;
    setEmployeeModalMode('edit');
    setFormEmployeeCode(selected.employeeCode || '');
    setFormFirstName(selected.firstName || '');
    setFormLastName(selected.lastName || '');
    setFormEmail(selected.email || '');
    setFormPhone(selected.phone || '');
    setFormStatus(selected.status || 'ACTIVE');
    setFormScope(selected.scope || 'COMPANY');
    setFormPrimaryDivisionId(selected.primaryDivisionId || '');
    setFormReason('');
    setFormIdempotencyKey('');
    setEmployeeModalOpen(true);
  };

  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [scopeNext, setScopeNext] = useState('COMPANY');
  const [scopeNextDivisionId, setScopeNextDivisionId] = useState('');
  const [scopeReason, setScopeReason] = useState('');

  const openScopeModal = () => {
    if (!selected) return;
    setScopeNext(selected.scope || 'COMPANY');
    setScopeNextDivisionId(selected.primaryDivisionId || '');
    setScopeReason('');
    setScopeModalOpen(true);
  };

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusNext, setStatusNext] = useState('ACTIVE');
  const [statusReason, setStatusReason] = useState('');

  const openStatusModal = () => {
    if (!selected) return;
    setStatusNext(selected.status || 'ACTIVE');
    setStatusReason('');
    setStatusModalOpen(true);
  };

  const [compModalOpen, setCompModalOpen] = useState(false);
  const [compAmount, setCompAmount] = useState('');
  const [compCurrency, setCompCurrency] = useState('USD');
  const [compFrequency, setCompFrequency] = useState('MONTHLY');
  const [compEffectiveFrom, setCompEffectiveFrom] = useState('');
  const [compReason, setCompReason] = useState('');

  const openCompModal = () => {
    setCompAmount('');
    setCompCurrency('USD');
    setCompFrequency('MONTHLY');
    setCompEffectiveFrom('');
    setCompReason('');
    setCompModalOpen(true);
  };

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docType, setDocType] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docStorageKey, setDocStorageKey] = useState('');
  const [docMimeType, setDocMimeType] = useState('');
  const [docSizeBytes, setDocSizeBytes] = useState('');
  const [docReason, setDocReason] = useState('');

  const openDocModal = () => {
    setDocType('');
    setDocFileName('');
    setDocStorageKey('');
    setDocMimeType('');
    setDocSizeBytes('');
    setDocReason('');
    setDocModalOpen(true);
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

  const ReadOnlyContextPanel = (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
              {selected ? initialsFromEmployee(selected) : '—'}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{selected ? formatName(selected) : 'Employee detail'}</div>
              <div className="mt-1 text-xs text-slate-500">
                {selected ? `${selected.employeeCode} · ${selected.email || '—'}` : 'Select an employee to view details.'}
              </div>
            </div>
          </div>
        </div>

        {selected ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {statusBadge(selected.status)}
            {scopeBadge(selected.scope, selected?.scope === 'DIVISION' ? divisionsById[selected?.primaryDivisionId]?.color : null)}
          </div>
        ) : null}
      </div>

      <div className="p-4">
        {!selectedId ? (
          <EmptyState title="No employee selected" description="Pick someone from the directory to view employment details." />
        ) : detailState.status === 'loading' ? (
          <LoadingState message="Loading employee…" />
        ) : detailState.status === 'error' ? (
          detailState.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={detailState.error} />
        ) : selected ? (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-slate-500">Employment scope impact</div>
              <div className="mt-1 text-sm text-slate-700">
                {selected.scope === 'DIVISION'
                  ? 'This employee is a DIVISION resource. Costs impact division P&L.'
                  : 'This employee is a COMPANY resource. Costs roll up to company overhead.'}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">Payroll / P&L impact</div>
              <div className="mt-1 text-sm text-slate-700">Compensation history must remain append-only for payroll accuracy.</div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">Month-close locking</div>
              <div className="mt-1 text-sm text-slate-700">When the month is closed, employee changes are locked to protect financial reporting.</div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">Audit notes</div>
              <div className="mt-1 text-sm text-slate-700">Sensitive actions require a reason and are recorded in Audit Logs.</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold">
          Employees
        </h1>
        <p className="text-sm text-gray-500">
          Employment records and financial scope
        </p>
      </div>
      
      <div className="flex justify-center mb-6">
        {canWrite ? (
          <button
            type="button"
            className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
            onClick={() => navigate(getEmployeeAddPath(bootstrap?.rbac?.roles))}
          >
            <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
            <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="relative">Add Employee</span>
          </button>
        ) : null}
      </div>

      <div className="bg-white border-b border-slate-200/60 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[240px] flex-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Search Employees</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Icon name="search" className="text-slate-400" />
                </div>
                <input
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or code..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  viewMode === 'grid' 
                    ? 'bg-blue-100 text-blue-700 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <Icon name="grid" className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  viewMode === 'table' 
                    ? 'bg-blue-100 text-blue-700 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <Icon name="table" className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Employee List Content */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                Employees
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Showing {filteredBySearch.length} on this page · <span className="font-medium text-blue-600">{total}</span> total
              </div>
            </div>
            <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
              <span className="text-sm font-medium text-slate-700">Page {page}</span>
            </div>
          </div>
        </div>

        {filteredBySearch.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No employees" description="Try changing filters or search." />
          </div>
        ) : (
          <div>
            {/* Mobile Grid View */}
            <div className="sm:hidden p-3 space-y-2">
              {filteredBySearch.map((e) => {
                const isSelected = selectedId === e.id;
                const division = divisionsById[e.primaryDivisionId];
                const divisionColor = division?.color || '#3B82F6';
                return (
                  <div
                    key={e.id}
                    className={cx(
                      'w-full text-left rounded-2xl border p-5 transition-all duration-200 hover:shadow-lg',
                      isSelected 
                        ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md' 
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedId(e.id);
                      setActiveTab('profile');
                      setMobileDetailOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedId(e.id);
                        setActiveTab('profile');
                        setMobileDetailOpen(true);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={cx(
                          'h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shadow-inner',
                          isSelected ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white'
                        )}>
                          {initialsFromEmployee(e)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cx(
                            'text-base font-semibold truncate',
                            isSelected ? 'text-blue-900' : 'text-slate-900'
                          )}>{formatName(e)}</div>
                          <div className="mt-1 font-mono text-xs text-slate-500">{e.employeeCode}</div>
                          <div className="mt-1 text-xs text-slate-500 truncate">{e.email || '—'}</div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {scopeBadge(e.scope, divisionColor)}
                            {statusBadge(e.status)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={cx(
                          'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md',
                          isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(getEmployeeViewPath(bootstrap?.rbac?.roles, e.id));
                        }}
                      >
                        View
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Employee ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Scope</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Division</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Designation</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Joined On</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredBySearch.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">{e.employeeCode}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                              {initialsFromEmployee(e)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-900">{formatName(e)}</div>
                              <div className="text-xs text-slate-500">{e.email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{scopeBadge(e.scope)}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">
                            {e.scope === 'COMPANY' ? '—' : formatDivisionLabel(divisionsById, e.primaryDivisionId)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">{e.designation || '—'}</span>
                        </td>
                        <td className="px-4 py-3">{statusBadge(e.status)}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">
                            {e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            onClick={() => navigate(getEmployeeViewPath(bootstrap?.rbac?.roles, e.id))}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing <span className="font-medium text-slate-900">{((page - 1) * pageSize) + 1}</span> to{' '}
              <span className="font-medium text-slate-900">{Math.min(page * pageSize, total)}</span> of{' '}
              <span className="font-medium text-blue-600">{total}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <div className="flex items-center gap-1">
                <span className="px-3 py-2 text-sm font-semibold text-slate-900 bg-blue-50 border border-blue-200 rounded-xl">
                  {page}
                </span>
                <span className="text-sm text-slate-500 mx-1">of</span>
                <span className="text-sm font-medium text-slate-700">
                  {Math.ceil(total / pageSize)}
                </span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                disabled={page >= Math.ceil(total / pageSize)}
                onClick={() => setPage(page + 1)}
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Detail Panel */}
      {selectedId && mobileDetailOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-50 xl:hidden">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setMobileDetailOpen(false)}
              >
                Back
              </button>
              <div className="min-w-0 text-sm font-semibold text-slate-900 truncate">Employee</div>
              <div className="w-[68px]" />
            </div>
          </div>
          <div className="p-4">{ReadOnlyContextPanel}</div>
        </div>
      ) : null}
    </div>
  );
}
