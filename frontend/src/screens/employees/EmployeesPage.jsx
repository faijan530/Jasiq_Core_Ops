import React, { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

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
  const s = String(status || '').toUpperCase();
  const cls =
    s === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-700'
      : s === 'ON_HOLD'
        ? 'bg-amber-50 text-amber-800'
        : s === 'EXITED'
          ? 'bg-rose-50 text-rose-700'
          : 'bg-slate-100 text-slate-800';

  return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>{s || '—'}</span>;
}

function compensationBadge(type) {
  const s = String(type || '').toUpperCase();
  const cls =
    s === 'MONTHLY'
      ? 'bg-blue-50 text-blue-700'
      : s === 'HOURLY'
        ? 'bg-purple-50 text-purple-700'
        : s === 'ANNUAL'
          ? 'bg-amber-50 text-amber-800'
          : 'bg-slate-100 text-slate-800';

  return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>{s}</span>;
}

function scopeBadge(scope) {
  const s = String(scope || '').toUpperCase();
  const cls = s === 'DIVISION' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800';
  return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>{s || '—'}</span>;
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

  const permissions = bootstrap?.rbac?.permissions || [];
  const canWrite = permissions.includes('EMPLOYEE_WRITE');
  const canCompWrite = permissions.includes('EMPLOYEE_COMPENSATION_WRITE');
  const canDocWrite = permissions.includes('EMPLOYEE_DOCUMENT_WRITE');

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [divisionId, setDivisionId] = useState('');
  const [scope, setScope] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [compensationType, setCompensationType] = useState('');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(true);
  const [scopeOpen, setScopeOpen] = useState(true);
  const [divisionOpen, setDivisionOpen] = useState(true);
  const [employmentTypeOpen, setEmploymentTypeOpen] = useState(false);
  const [compTypeOpen, setCompTypeOpen] = useState(true);

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

  const filteredByCompensationType = useMemo(() => {
    if (!compensationType) return items;
    if (compensationType === 'NONE') return items.filter((e) => !e.compensationType);
    return items.filter((e) => e.compensationType === compensationType);
  }, [items, compensationType]);

  const filteredBySearch = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return filteredByCompensationType;
    return filteredByCompensationType.filter((e) => {
      const code = String(e.employeeCode || '').toLowerCase();
      const nm = formatName(e).toLowerCase();
      return code.includes(q) || nm.includes(q);
    });
  }, [filteredByCompensationType, search]);

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
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title={title} />
        <LoadingState />
      </div>
    );
  }

  if (list.status === 'error') {
    if (list.error?.status === 403) {
      return (
        <div className="min-h-screen bg-slate-50">
          <PageHeader title={title} />
          <ForbiddenState />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title={title} />
        <ErrorState error={list.error} />
      </div>
    );
  }

  const FilterSidebar = (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Filters</div>
            <div className="mt-1 text-xs text-slate-500">Counts reflect the current page.</div>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setDivisionId('');
              setScope('');
              setStatus('');
              setSearch('');
              setPage(1);
            }}
          >
            Clear
          </button>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-600">Search</label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
            <Icon name="search" className="text-slate-400" />
            <input
              className="w-full border-0 p-0 text-sm focus:ring-0"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or code"
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="border-t border-slate-100" />

        <FilterSection title="Status" open={statusOpen} onToggle={() => setStatusOpen((v) => !v)}>
          <div className="space-y-1">
            <FilterRadio
              label="Any"
              checked={!status}
              count={items.length}
              onChange={() => {
                setStatus('');
                setPage(1);
              }}
            />
            <FilterRadio
              label="Active"
              checked={status === 'ACTIVE'}
              count={counts.statusCounts.ACTIVE}
              onChange={() => {
                setStatus('ACTIVE');
                setPage(1);
              }}
            />
            <FilterRadio
              label="On hold"
              checked={status === 'ON_HOLD'}
              count={counts.statusCounts.ON_HOLD}
              onChange={() => {
                setStatus('ON_HOLD');
                setPage(1);
              }}
            />
            <FilterRadio
              label="Exited"
              checked={status === 'EXITED'}
              count={counts.statusCounts.EXITED}
              onChange={() => {
                setStatus('EXITED');
                setPage(1);
              }}
            />
          </div>
        </FilterSection>

        <FilterSection title="Scope" open={scopeOpen} onToggle={() => setScopeOpen((v) => !v)}>
          <div className="space-y-1">
            <FilterRadio
              label="Any"
              checked={!scope}
              count={items.length}
              onChange={() => {
                setScope('');
                setPage(1);
              }}
            />
            <FilterRadio
              label="Company"
              checked={scope === 'COMPANY'}
              count={counts.scopeCounts.COMPANY}
              onChange={() => {
                setScope('COMPANY');
                setPage(1);
              }}
            />
            <FilterRadio
              label="Division"
              checked={scope === 'DIVISION'}
              count={counts.scopeCounts.DIVISION}
              onChange={() => {
                setScope('DIVISION');
                setPage(1);
              }}
            />
          </div>
        </FilterSection>

        <FilterSection title="Division" open={divisionOpen} onToggle={() => setDivisionOpen((v) => !v)}>
          <div className="space-y-1 max-h-64 overflow-auto pr-1">
            <FilterRadio
              label="Any"
              checked={!divisionId}
              count={items.length}
              onChange={() => {
                setDivisionId('');
                setPage(1);
              }}
            />
            {(divisions.data?.items || []).map((d) => {
              const c = counts.divisionCounts[d.id] || 0;
              return (
                <FilterRadio
                  key={d.id}
                  label={`${d.code} — ${d.name}`}
                  checked={divisionId === d.id}
                  count={c}
                  onChange={() => {
                    setDivisionId(d.id);
                    setPage(1);
                  }}
                />
              );
            })}
          </div>
        </FilterSection>

        <FilterSection title="Employment Type" open={employmentTypeOpen} onToggle={() => setEmploymentTypeOpen((v) => !v)}>
          <div className="space-y-1">
            <FilterRadio label="Not available" checked count={0} onChange={() => {}} disabled />
          </div>
        </FilterSection>

        <FilterSection title="Compensation Type" open={compTypeOpen} onToggle={() => setCompTypeOpen((v) => !v)}>
          <div className="space-y-1">
            <FilterRadio
              label="All"
              checked={!compensationType}
              count={items.length}
              onChange={() => {
                setCompensationType('');
                setPage(1);
              }}
            />
            {['MONTHLY', 'HOURLY', 'ANNUAL'].map((type) => {
              const count = items.filter((e) => e.compensationType === type).length;
              return (
                <FilterRadio
                  key={type}
                  label={type}
                  checked={compensationType === type}
                  count={count}
                  onChange={() => {
                    setCompensationType(type);
                    setPage(1);
                  }}
                />
              );
            })}
            <FilterRadio
              label="None"
              checked={compensationType === 'NONE'}
              count={items.filter((e) => !e.compensationType).length}
              onChange={() => {
                setCompensationType('NONE');
                setPage(1);
              }}
            />
          </div>
        </FilterSection>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title={title}
        subtitle="Directory"
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex lg:hidden items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setFilterDrawerOpen(true)}
            >
              <Icon name="filter" className="text-slate-600" />
              Filters
            </button>
            {canWrite ? (
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={openCreateEmployee}
              >
                Add Employee
              </button>
            ) : null}
          </div>
        }
      />

      {filterDrawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setFilterDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-full max-w-sm bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Filters</div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700"
                onClick={() => setFilterDrawerOpen(false)}
              >
                <Icon name="x" />
              </button>
            </div>
            <div className="mt-4">{FilterSidebar}</div>
          </div>
        </div>
      ) : null}

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
          <div className="p-4">
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

                  {selected ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      {canWrite ? (
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                          disabled={selectedExited || updateMutation.status === 'loading'}
                          onClick={openEditEmployee}
                        >
                          Edit Profile
                        </button>
                      ) : null}

                      {canWrite ? (
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                          disabled={selectedExited || changeScopeMutation.status === 'loading'}
                          onClick={openScopeModal}
                        >
                          Change Scope
                        </button>
                      ) : null}

                      {canWrite ? (
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                          disabled={selectedExited || changeStatusMutation.status === 'loading'}
                          onClick={openStatusModal}
                        >
                          Change Status
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {selected ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {statusBadge(selected.status)}
                    {selected.compensationType ? compensationBadge(selected.compensationType) : null}
                    {scopeBadge(selected.scope)}
                    {selected.scope === 'DIVISION' ? (
                      <span className="text-xs text-slate-600">{formatDivisionLabel(divisionsById, selected.primaryDivisionId)}</span>
                    ) : null}
                  </div>
                ) : null}

                {selectedExited ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Status is EXITED. Write actions are disabled.
                  </div>
                ) : null}

                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'profile', label: 'Profile' },
                      { id: 'scope', label: 'Scope History' },
                      { id: 'compensation', label: 'Compensation' },
                      { id: 'documents', label: 'Documents' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={cx(
                          'rounded-lg px-3 py-2 text-sm font-medium',
                          activeTab === t.id ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                          !selected ? 'opacity-50 cursor-not-allowed' : ''
                        )}
                        onClick={() => setActiveTab(t.id)}
                        disabled={!selected}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4">
                {!selectedId ? (
                  <EmptyState title="No employee selected" description="Pick someone from the directory to view profile, history, compensation and documents." />
                ) : detailState.status === 'loading' ? (
                  <LoadingState label="Loading employee…" />
                ) : detailState.status === 'error' ? (
                  detailState.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={detailState.error} />
                ) : selected ? (
                  <>
                    {activeTab === 'profile' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <div className="text-xs font-medium text-slate-500">Employee Code</div>
                          <div className="mt-1 font-mono text-sm text-slate-900">{selected.employeeCode}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <div className="text-xs font-medium text-slate-500">Name</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">{formatName(selected)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <div className="text-xs font-medium text-slate-500">Email</div>
                          <div className="mt-1 text-sm text-slate-900">{selected.email || '—'}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <div className="text-xs font-medium text-slate-500">Phone</div>
                          <div className="mt-1 text-sm text-slate-900">{selected.phone || '—'}</div>
                        </div>
                      </div>
                    ) : null}

                    {activeTab === 'scope' ? (
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Scope History</div>
                        <div className="mt-2 grid grid-cols-1 gap-3">
                          {(detailState.data?.scopeHistory || []).length === 0 ? (
                            <EmptyState title="No scope history" />
                          ) : (
                            (detailState.data?.scopeHistory || []).map((h) => (
                              <div key={h.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-xs font-medium text-slate-500">Scope</div>
                                    <div className="mt-1 flex items-center gap-2">
                                      {scopeBadge(h.scope)}
                                      {h.scope === 'DIVISION' ? (
                                        <span className="text-xs text-slate-600">{formatDivisionLabel(divisionsById, h.primaryDivisionId)}</span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs font-medium text-slate-500">Effective</div>
                                    <div className="mt-1 text-xs text-slate-700">
                                      {new Date(h.effectiveFrom).toLocaleString()} — {h.effectiveTo ? new Date(h.effectiveTo).toLocaleString() : 'Active'}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <div className="text-xs font-medium text-slate-500">Reason</div>
                                  <div className="mt-1 text-sm text-slate-900">{h.reason}</div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}

                    {activeTab === 'compensation' ? (
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">Compensation</div>
                            <div className="mt-1 text-xs text-slate-500">Append-only versions. Effective dates must not overlap.</div>
                          </div>
                          {canCompWrite ? (
                            <button
                              type="button"
                              className="w-full sm:w-auto rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                              disabled={!selected || selectedExited || addCompMutation.status === 'loading'}
                              onClick={openCompModal}
                            >
                              Add Version
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-3">
                          {compState.status === 'loading' ? (
                            <LoadingState label="Loading compensation…" />
                          ) : compState.status === 'error' ? (
                            <ErrorState error={compState.error} />
                          ) : (compState.data?.items || []).length === 0 ? (
                            <EmptyState title="No compensation versions" />
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              {(compState.data?.items || []).map((c) => (
                                <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-xs font-medium text-slate-500">Amount</div>
                                      <div className="mt-1 text-sm font-semibold text-slate-900">
                                        {c.currency} {Number(c.amount).toFixed(2)} ({c.frequency})
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs font-medium text-slate-500">Effective</div>
                                      <div className="mt-1 text-xs text-slate-700">
                                        {String(c.effectiveFrom)} — {c.effectiveTo ? String(c.effectiveTo) : 'Active'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-3">
                                    <div className="text-xs font-medium text-slate-500">Reason</div>
                                    <div className="mt-1 text-sm text-slate-900">{c.reason}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {activeTab === 'documents' ? (
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">Documents</div>
                            <div className="mt-1 text-xs text-slate-500">Metadata only. Downloads use signed URLs.</div>
                          </div>
                          {canDocWrite ? (
                            <button
                              type="button"
                              className="w-full sm:w-auto rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                              disabled={!selected || selectedExited || uploadDocMutation.status === 'loading'}
                              onClick={openDocModal}
                            >
                              Upload Metadata
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-3">
                          {docState.status === 'loading' ? (
                            <LoadingState label="Loading documents…" />
                          ) : docState.status === 'error' ? (
                            <ErrorState error={docState.error} />
                          ) : (docState.data?.items || []).length === 0 ? (
                            <EmptyState title="No documents" />
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              {(docState.data?.items || []).map((d) => (
                                <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <div className="text-sm font-semibold text-slate-900 truncate">{d.fileName}</div>
                                        {d.isActive ? (
                                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>
                                        ) : (
                                          <span className="inline-flex rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">Inactive</span>
                                        )}
                                      </div>
                                      <div className="mt-1 text-xs text-slate-500">{d.documentType}</div>
                                    </div>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                                      disabled={!d.isActive || downloadDocMutation.status === 'loading'}
                                      onClick={async () => {
                                        const payload = await downloadDocMutation.run({ id: selectedId, docId: d.id });
                                        const url = payload?.url;
                                        if (url) {
                                          window.open(url, '_blank', 'noopener,noreferrer');
                                        }
                                      }}
                                    >
                                      <Icon name="download" />
                                      Download
                                    </button>
                                  </div>
                                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <div className="text-xs font-medium text-slate-500">MIME</div>
                                      <div className="mt-1 text-xs text-slate-700">{d.mimeType || '—'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-slate-500">Size</div>
                                      <div className="mt-1 text-xs text-slate-700">{typeof d.sizeBytes === 'number' ? `${d.sizeBytes} bytes` : '—'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-slate-500">Uploaded</div>
                                      <div className="mt-1 text-xs text-slate-700">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : '—'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-slate-500">Uploaded By</div>
                                      <div className="mt-1 text-xs text-slate-700">{d.uploadedBy ? String(d.uploadedBy).slice(0, 8) + '…' : '—'}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">
          <div className="hidden lg:block lg:col-span-4 xl:col-span-3">
            <div className="sticky top-6">{FilterSidebar}</div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Employees</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Showing {filteredBySearch.length} on this page · Total {total}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">Page {page}</div>
                  </div>
                </div>

                {filteredBySearch.length === 0 ? (
                  <div className="p-6">
                    <EmptyState title="No employees" description="Try changing filters or search." />
                  </div>
                ) : (
                  <div>
                    <div className="md:hidden p-3 space-y-2">
                      {filteredBySearch.map((e) => {
                        const isSelected = selectedId === e.id;
                        return (
                          <button
                            key={e.id}
                            type="button"
                            className={cx(
                              'w-full text-left rounded-2xl border p-4 shadow-sm',
                              isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                            )}
                            onClick={() => {
                              setSelectedId(e.id);
                              setActiveTab('profile');
                              setMobileDetailOpen(true);
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                                  {initialsFromEmployee(e)}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">{formatName(e)}</div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs text-slate-600">{e.employeeCode}</span>
                                    {statusBadge(e.status)}
                                    {scopeBadge(e.scope)}
                                    {e.compensationType ? compensationBadge(e.compensationType) : null}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">{formatDivisionLabel(divisionsById, e.primaryDivisionId)}</div>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="hidden md:block">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Avatar</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Code</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Compensation</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Scope</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Division</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredBySearch.map((e) => {
                              const isSelected = selectedId === e.id;
                              const exited = e.status === 'EXITED';
                              return (
                                <tr key={e.id} className={isSelected ? 'bg-slate-50' : ''}>
                                  <td className="px-4 py-3">
                                    <button
                                      type="button"
                                      className="flex items-center gap-3 text-left"
                                      onClick={() => {
                                        setSelectedId(e.id);
                                        setActiveTab('profile');
                                        setMobileDetailOpen(true);
                                      }}
                                    >
                                      <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                                        {initialsFromEmployee(e)}
                                      </div>
                                    </button>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-mono text-sm text-slate-900">{e.employeeCode}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-sm font-semibold text-slate-900">{formatName(e)}</div>
                                    <div className="text-xs text-slate-500">{e.email || '—'}</div>
                                  </td>
                                  <td className="px-4 py-3">{statusBadge(e.status)}</td>
                                  <td className="px-4 py-3">
                                    {e.compensationType ? compensationBadge(e.compensationType) : <span className="text-xs text-slate-400">—</span>}
                                  </td>
                                  <td className="px-4 py-3">{scopeBadge(e.scope)}</td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm text-slate-700">{formatDivisionLabel(divisionsById, e.primaryDivisionId)}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {canWrite ? (
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                                        disabled={exited}
                                        onClick={() => {
                                          setSelectedId(e.id);
                                          setActiveTab('profile');
                                          openEditEmployeeFromEmployee(e);
                                        }}
                                      >
                                        <Icon name="edit" />
                                        Edit
                                      </button>
                                    ) : (
                                      <span className="text-xs text-slate-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="p-4 border-t border-slate-200">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <button
                          type="button"
                          className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </button>
                        <div className="text-sm text-slate-600">Page {page}</div>
                        <button
                          type="button"
                          className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                          disabled={page * pageSize >= total}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden xl:block bg-white rounded-2xl border border-slate-200 shadow-sm">
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

                    {selected ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        {canWrite ? (
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                            disabled={selectedExited || updateMutation.status === 'loading'}
                            onClick={openEditEmployee}
                          >
                            Edit Profile
                          </button>
                        ) : null}

                        {canWrite ? (
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                            disabled={selectedExited || changeScopeMutation.status === 'loading'}
                            onClick={openScopeModal}
                          >
                            Change Scope
                          </button>
                        ) : null}

                        {canWrite ? (
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                            disabled={selectedExited || changeStatusMutation.status === 'loading'}
                            onClick={openStatusModal}
                          >
                            Change Status
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {selected ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {statusBadge(selected.status)}
                      {selected.compensationType ? compensationBadge(selected.compensationType) : null}
                      {scopeBadge(selected.scope)}
                      {selected.scope === 'DIVISION' ? (
                        <span className="text-xs text-slate-600">{formatDivisionLabel(divisionsById, selected.primaryDivisionId)}</span>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedExited ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Status is EXITED. Write actions are disabled.
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'profile', label: 'Profile' },
                        { id: 'scope', label: 'Scope History' },
                        { id: 'compensation', label: 'Compensation' },
                        { id: 'documents', label: 'Documents' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={cx(
                            'rounded-lg px-3 py-2 text-sm font-medium',
                            activeTab === t.id ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                            !selected ? 'opacity-50 cursor-not-allowed' : ''
                          )}
                          onClick={() => setActiveTab(t.id)}
                          disabled={!selected}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {!selectedId ? (
                    <EmptyState title="No employee selected" description="Pick someone from the directory to view profile, history, compensation and documents." />
                  ) : detailState.status === 'loading' ? (
                    <LoadingState label="Loading employee…" />
                  ) : detailState.status === 'error' ? (
                    detailState.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={detailState.error} />
                  ) : selected ? (
                    <>
                      {activeTab === 'profile' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="text-xs font-medium text-slate-500">Employee Code</div>
                            <div className="mt-1 font-mono text-sm text-slate-900">{selected.employeeCode}</div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="text-xs font-medium text-slate-500">Name</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">{formatName(selected)}</div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="text-xs font-medium text-slate-500">Email</div>
                            <div className="mt-1 text-sm text-slate-900">{selected.email || '—'}</div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="text-xs font-medium text-slate-500">Phone</div>
                            <div className="mt-1 text-sm text-slate-900">{selected.phone || '—'}</div>
                          </div>
                        </div>
                      ) : null}

                    {activeTab === 'scope' ? (
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Scope History</div>
                        <div className="mt-2 grid grid-cols-1 gap-3">
                          {(detailState.data?.scopeHistory || []).length === 0 ? (
                            <EmptyState title="No scope history" />
                          ) : (
                            (detailState.data?.scopeHistory || []).map((h) => (
                              <div key={h.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-xs font-medium text-slate-500">Scope</div>
                                    <div className="mt-1 flex items-center gap-2">
                                      {scopeBadge(h.scope)}
                                      {h.scope === 'DIVISION' ? (
                                        <span className="text-xs text-slate-600">{formatDivisionLabel(divisionsById, h.primaryDivisionId)}</span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs font-medium text-slate-500">Effective</div>
                                    <div className="mt-1 text-xs text-slate-700">
                                      {new Date(h.effectiveFrom).toLocaleString()} — {h.effectiveTo ? new Date(h.effectiveTo).toLocaleString() : 'Active'}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <div className="text-xs font-medium text-slate-500">Reason</div>
                                  <div className="mt-1 text-sm text-slate-900">{h.reason}</div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}

                    {activeTab === 'compensation' ? (
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">Compensation</div>
                            <div className="mt-1 text-xs text-slate-500">Append-only versions. Effective dates must not overlap.</div>
                          </div>
                          {canCompWrite ? (
                            <button
                              type="button"
                              className="w-full sm:w-auto rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                              disabled={!selected || selectedExited || addCompMutation.status === 'loading'}
                              onClick={openCompModal}
                            >
                              Add Version
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-3">
                          {compState.status === 'loading' ? (
                            <LoadingState label="Loading compensation…" />
                          ) : compState.status === 'error' ? (
                            <ErrorState error={compState.error} />
                          ) : (compState.data?.items || []).length === 0 ? (
                            <EmptyState title="No compensation versions" />
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              {(compState.data?.items || []).map((c) => (
                                <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-xs font-medium text-slate-500">Amount</div>
                                      <div className="mt-1 text-sm font-semibold text-slate-900">
                                        {c.currency} {Number(c.amount).toFixed(2)} ({c.frequency})
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs font-medium text-slate-500">Effective</div>
                                      <div className="mt-1 text-xs text-slate-700">
                                        {String(c.effectiveFrom)} — {c.effectiveTo ? String(c.effectiveTo) : 'Active'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-3">
                                    <div className="text-xs font-medium text-slate-500">Reason</div>
                                    <div className="mt-1 text-sm text-slate-900">{c.reason}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {activeTab === 'documents' ? (
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">Documents</div>
                            <div className="mt-1 text-xs text-slate-500">Metadata only. Downloads use signed URLs.</div>
                          </div>
                          {canDocWrite ? (
                            <button
                              type="button"
                              className="w-full sm:w-auto rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                              disabled={!selected || selectedExited || uploadDocMutation.status === 'loading'}
                              onClick={openDocModal}
                            >
                              Upload Metadata
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-3">
                          {docState.status === 'loading' ? (
                            <LoadingState label="Loading documents…" />
                          ) : docState.status === 'error' ? (
                            <ErrorState error={docState.error} />
                          ) : (docState.data?.items || []).length === 0 ? (
                            <EmptyState title="No documents" />
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              {(docState.data?.items || []).map((d) => (
                                <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <div className="text-sm font-semibold text-slate-900 truncate">{d.fileName}</div>
                                        {d.isActive ? (
                                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>
                                        ) : (
                                          <span className="inline-flex rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">Inactive</span>
                                        )}
                                      </div>
                                      <div className="mt-1 text-xs text-slate-500">{d.documentType}</div>
                                    </div>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                                      disabled={!d.isActive || downloadDocMutation.status === 'loading'}
                                      onClick={async () => {
                                        const payload = await downloadDocMutation.run({ id: selectedId, docId: d.id });
                                        const url = payload?.url;
                                        if (url) {
                                          window.open(url, '_blank', 'noopener,noreferrer');
                                        }
                                      }}
                                    >
                                      <Icon name="download" />
                                      Download
                                    </button>
                                  </div>
                                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <div className="text-xs font-medium text-slate-500">MIME</div>
                                      <div className="mt-1 text-xs text-slate-700">{d.mimeType || '—'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-slate-500">Size</div>
                                      <div className="mt-1 text-xs text-slate-700">{typeof d.sizeBytes === 'number' ? `${d.sizeBytes} bytes` : '—'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-slate-500">Uploaded</div>
                                      <div className="mt-1 text-xs text-slate-700">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : '—'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-slate-500">Uploaded By</div>
                                      <div className="mt-1 text-xs text-slate-700">{d.uploadedBy ? String(d.uploadedBy).slice(0, 8) + '…' : '—'}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* Create/Edit Employee Modal */}
      {employeeModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (createMutation.status === 'loading' || updateMutation.status === 'loading') return;
              setEmployeeModalOpen(false);
            }}
          />
          <div className="relative w-full max-w-2xl rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">
              {employeeModalMode === 'create' ? 'Create Employee' : 'Edit Employee'}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Employee Code</label>
                <input
                  className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono disabled:bg-slate-50"
                  value={formEmployeeCode}
                  onChange={(e) => setFormEmployeeCode(e.target.value)}
                  disabled={employeeModalMode !== 'create'}
                />
                {employeeModalMode !== 'create' ? (
                  <div className="mt-1 text-xs text-slate-500">Employee code is immutable.</div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  className="mt-1 w-full rounded-md border-slate-300 text-sm disabled:bg-slate-50"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  disabled={employeeModalMode !== 'create'}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                  <option value="EXITED">EXITED</option>
                </select>
                {employeeModalMode !== 'create' ? (
                  <div className="mt-1 text-xs text-slate-500">Use Change Status for lifecycle transitions.</div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">First Name</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Last Name</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={formLastName} onChange={(e) => setFormLastName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Phone</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Scope</label>
                <select
                  className="mt-1 w-full rounded-md border-slate-300 text-sm disabled:bg-slate-50"
                  value={formScope}
                  onChange={(e) => setFormScope(e.target.value)}
                  disabled={employeeModalMode !== 'create'}
                >
                  <option value="COMPANY">COMPANY</option>
                  <option value="DIVISION">DIVISION</option>
                </select>
                {employeeModalMode !== 'create' ? (
                  <div className="mt-1 text-xs text-slate-500">Use Change Scope for scope transitions.</div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Primary Division</label>
                <select
                  className="mt-1 w-full rounded-md border-slate-300 text-sm disabled:bg-slate-50"
                  value={formPrimaryDivisionId}
                  onChange={(e) => setFormPrimaryDivisionId(e.target.value)}
                  disabled={employeeModalMode !== 'create' || formScope !== 'DIVISION'}
                >
                  <option value="">{formScope === 'DIVISION' ? 'Select…' : '—'}</option>
                  {(divisions.data?.items || []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {employeeModalMode === 'create' ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Idempotency Key (optional)</label>
                  <input className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono" value={formIdempotencyKey} onChange={(e) => setFormIdempotencyKey(e.target.value)} />
                  <div className="mt-1 text-xs text-slate-500">If provided, repeated creates will return the same employee.</div>
                </div>
              ) : null}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Reason (optional)</label>
                <textarea className="mt-1 w-full h-24 rounded-md border-slate-300 text-sm" value={formReason} onChange={(e) => setFormReason(e.target.value)} />
              </div>
            </div>

            {createMutation.status === 'error' ? (
              <div className="mt-3">
                <ErrorState error={createMutation.error} />
              </div>
            ) : null}

            {updateMutation.status === 'error' ? (
              <div className="mt-3">
                <ErrorState error={updateMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={createMutation.status === 'loading' || updateMutation.status === 'loading'}
                onClick={() => setEmployeeModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={
                  (employeeModalMode === 'create'
                    ? createMutation.status === 'loading'
                    : updateMutation.status === 'loading') ||
                  formEmployeeCode.trim().length === 0 ||
                  formFirstName.trim().length === 0 ||
                  formLastName.trim().length === 0 ||
                  (employeeModalMode === 'create' && formScope === 'DIVISION' && !formPrimaryDivisionId)
                }
                onClick={async () => {
                  if (employeeModalMode === 'create') {
                    const payload = {
                      employeeCode: formEmployeeCode.trim(),
                      firstName: formFirstName.trim(),
                      lastName: formLastName.trim(),
                      email: formEmail.trim() || null,
                      phone: formPhone.trim() || null,
                      status: formStatus,
                      scope: formScope,
                      primaryDivisionId: formScope === 'DIVISION' ? formPrimaryDivisionId : null,
                      reason: formReason.trim() || null,
                      idempotencyKey: formIdempotencyKey.trim() || null
                    };

                    const res = await createMutation.run(payload);
                    const created = res?.item;
                    setEmployeeModalOpen(false);
                    list.refresh();
                    if (created?.id) {
                      setSelectedId(created.id);
                      setActiveTab('profile');
                      refreshDetail();
                    }
                    return;
                  }

                  if (!selectedId) return;

                  const payload = {
                    firstName: formFirstName.trim() || null,
                    lastName: formLastName.trim() || null,
                    email: formEmail.trim() || null,
                    phone: formPhone.trim() || null,
                    reason: formReason.trim() || null
                  };

                  await updateMutation.run({ id: selectedId, payload });
                  setEmployeeModalOpen(false);
                  list.refresh();
                  refreshDetail();
                }}
              >
                {employeeModalMode === 'create'
                  ? createMutation.status === 'loading'
                    ? 'Creating…'
                    : 'Create'
                  : updateMutation.status === 'loading'
                    ? 'Saving…'
                    : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Scope Change Modal */}
      {scopeModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (changeScopeMutation.status === 'loading') return;
              setScopeModalOpen(false);
            }}
          />
          <div className="relative w-full max-w-xl rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">Change Employee Scope</div>
            <div className="mt-1 text-sm text-slate-600">Scope changes are append-only and require a reason.</div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Scope</label>
                <select className="mt-1 w-full rounded-md border-slate-300 text-sm" value={scopeNext} onChange={(e) => setScopeNext(e.target.value)}>
                  <option value="COMPANY">COMPANY</option>
                  <option value="DIVISION">DIVISION</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Primary Division</label>
                <select
                  className="mt-1 w-full rounded-md border-slate-300 text-sm disabled:bg-slate-50"
                  value={scopeNextDivisionId}
                  onChange={(e) => setScopeNextDivisionId(e.target.value)}
                  disabled={scopeNext !== 'DIVISION'}
                >
                  <option value="">{scopeNext === 'DIVISION' ? 'Select…' : '—'}</option>
                  {(divisions.data?.items || []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Reason (required)</label>
                <textarea className="mt-1 w-full h-24 rounded-md border-slate-300 text-sm" value={scopeReason} onChange={(e) => setScopeReason(e.target.value)} />
                {scopeReason.trim().length === 0 ? <div className="mt-1 text-xs text-rose-700">Reason is required.</div> : null}
              </div>
            </div>

            {changeScopeMutation.status === 'error' ? (
              <div className="mt-3">
                <ErrorState error={changeScopeMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={changeScopeMutation.status === 'loading'}
                onClick={() => setScopeModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={
                  changeScopeMutation.status === 'loading' ||
                  !selectedId ||
                  scopeReason.trim().length === 0 ||
                  (scopeNext === 'DIVISION' && !scopeNextDivisionId)
                }
                onClick={async () => {
                  await changeScopeMutation.run({
                    id: selectedId,
                    payload: {
                      scope: scopeNext,
                      primaryDivisionId: scopeNext === 'DIVISION' ? scopeNextDivisionId : null,
                      reason: scopeReason.trim()
                    }
                  });
                  setScopeModalOpen(false);
                  list.refresh();
                  refreshDetail();
                }}
              >
                {changeScopeMutation.status === 'loading' ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Status Change Modal */}
      {statusModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (changeStatusMutation.status === 'loading') return;
              setStatusModalOpen(false);
            }}
          />
          <div className="relative w-full max-w-xl rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">Change Employee Status</div>
            <div className="mt-1 text-sm text-slate-600">Status affects payroll and attendance eligibility.</div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select className="mt-1 w-full rounded-md border-slate-300 text-sm" value={statusNext} onChange={(e) => setStatusNext(e.target.value)}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                  <option value="EXITED">EXITED</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Reason (optional)</label>
                <textarea className="mt-1 w-full h-24 rounded-md border-slate-300 text-sm" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
              </div>
            </div>

            {changeStatusMutation.status === 'error' ? (
              <div className="mt-3">
                <ErrorState error={changeStatusMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={changeStatusMutation.status === 'loading'}
                onClick={() => setStatusModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={changeStatusMutation.status === 'loading' || !selectedId}
                onClick={async () => {
                  await changeStatusMutation.run({
                    id: selectedId,
                    payload: {
                      status: statusNext,
                      reason: statusReason.trim() || null
                    }
                  });
                  setStatusModalOpen(false);
                  list.refresh();
                  refreshDetail();
                }}
              >
                {changeStatusMutation.status === 'loading' ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Compensation Modal */}
      {compModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (addCompMutation.status === 'loading') return;
              setCompModalOpen(false);
            }}
          />
          <div className="relative w-full max-w-xl rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">Add Compensation Version</div>
            <div className="mt-1 text-sm text-slate-600">Effective dates must not overlap. Reason is required.</div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Amount</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={compAmount} onChange={(e) => setCompAmount(e.target.value)} placeholder="5000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Currency</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono" value={compCurrency} onChange={(e) => setCompCurrency(e.target.value)} placeholder="USD" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Frequency</label>
                <select className="mt-1 w-full rounded-md border-slate-300 text-sm" value={compFrequency} onChange={(e) => setCompFrequency(e.target.value)}>
                  <option value="HOURLY">HOURLY</option>
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="ANNUAL">ANNUAL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Effective From</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" type="date" value={compEffectiveFrom} onChange={(e) => setCompEffectiveFrom(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Reason (required)</label>
                <textarea className="mt-1 w-full h-24 rounded-md border-slate-300 text-sm" value={compReason} onChange={(e) => setCompReason(e.target.value)} />
                {compReason.trim().length === 0 ? <div className="mt-1 text-xs text-rose-700">Reason is required.</div> : null}
              </div>
            </div>

            {addCompMutation.status === 'error' ? (
              <div className="mt-3">
                <ErrorState error={addCompMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={addCompMutation.status === 'loading'}
                onClick={() => setCompModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={
                  addCompMutation.status === 'loading' ||
                  !selectedId ||
                  compReason.trim().length === 0 ||
                  compEffectiveFrom.trim().length === 0 ||
                  compAmount.trim().length === 0
                }
                onClick={async () => {
                  await addCompMutation.run({
                    id: selectedId,
                    payload: {
                      amount: Number(compAmount),
                      currency: compCurrency.trim().toUpperCase(),
                      frequency: compFrequency,
                      effectiveFrom: compEffectiveFrom,
                      reason: compReason.trim()
                    }
                  });
                  setCompModalOpen(false);
                  refreshComp();
                }}
              >
                {addCompMutation.status === 'loading' ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Document Upload Modal (metadata only) */}
      {docModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (uploadDocMutation.status === 'loading') return;
              setDocModalOpen(false);
            }}
          />
          <div className="relative w-full max-w-2xl rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">Upload Employee Document (Metadata)</div>
            <div className="mt-1 text-sm text-slate-600">Provide a signed URL as storageKey. No deletes; documents can only be deactivated.</div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Document Type</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={docType} onChange={(e) => setDocType(e.target.value)} placeholder="OFFER_LETTER" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">File Name</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={docFileName} onChange={(e) => setDocFileName(e.target.value)} placeholder="offer-letter.pdf" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Storage Key (signed URL)</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono" value={docStorageKey} onChange={(e) => setDocStorageKey(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">MIME Type (optional)</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={docMimeType} onChange={(e) => setDocMimeType(e.target.value)} placeholder="application/pdf" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Size (bytes, optional)</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={docSizeBytes} onChange={(e) => setDocSizeBytes(e.target.value)} placeholder="12345" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Reason (optional)</label>
                <textarea className="mt-1 w-full h-24 rounded-md border-slate-300 text-sm" value={docReason} onChange={(e) => setDocReason(e.target.value)} />
              </div>
            </div>

            {uploadDocMutation.status === 'error' ? (
              <div className="mt-3">
                <ErrorState error={uploadDocMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={uploadDocMutation.status === 'loading'}
                onClick={() => setDocModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={
                  uploadDocMutation.status === 'loading' ||
                  !selectedId ||
                  docType.trim().length === 0 ||
                  docFileName.trim().length === 0 ||
                  docStorageKey.trim().length === 0
                }
                onClick={async () => {
                  await uploadDocMutation.run({
                    id: selectedId,
                    payload: {
                      documentType: docType.trim(),
                      fileName: docFileName.trim(),
                      storageKey: docStorageKey.trim(),
                      mimeType: docMimeType.trim() || null,
                      sizeBytes: docSizeBytes.trim().length > 0 ? Number(docSizeBytes) : null,
                      reason: docReason.trim() || null
                    }
                  });
                  setDocModalOpen(false);
                  refreshDocs();
                }}
              >
                {uploadDocMutation.status === 'loading' ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
