import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { apiFetch } from '../../api/client.js';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function toMonthEndIso(date) {
  const d = date instanceof Date ? date : new Date(date);
  const utcEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return utcEnd.toISOString().slice(0, 10);
}

function formatName(e) {
  const fn = String(e?.firstName || '').trim();
  const ln = String(e?.lastName || '').trim();
  const full = [fn, ln].filter(Boolean).join(' ').trim();
  return full || '—';
}

function initialsFromEmployee(e) {
  const fn = String(e?.firstName || '').trim();
  const ln = String(e?.lastName || '').trim();
  const a = fn ? fn[0] : '';
  const b = ln ? ln[0] : '';
  const s = (a + b).toUpperCase();
  return s || '—';
}

function formatDivisionLabel(divisionsById, divisionId) {
  if (!divisionId) return '—';
  const d = divisionsById[divisionId];
  if (!d) return String(divisionId).slice(0, 8) + '…';
  return `${d.code} — ${d.name}`;
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

function scopeBadge(scope, divisionColor) {
  const s = String(scope || '').toUpperCase();
  if (s === 'COMPANY') {
    return <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Shared</span>;
  }
  if (s === 'DIVISION') {
    const color = divisionColor || '#3B82F6';
    return (
      <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold" style={{ borderColor: color, color }}>
        DIVISION
      </span>
    );
  }
  return <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">—</span>;
}

function Icon({ name, className }) {
  const common = {
    className: cx('h-4 w-4', className),
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg'
  };

  if (name === 'x') {
    return (
      <svg {...common}>
        <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return null;
}

export function EmployeeProfilePage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];
  const roles = bootstrap?.rbac?.roles || [];
  const features = bootstrap?.features?.flags || {};
  const systemConfig = bootstrap?.systemConfig || {};

  const monthCloseEnabled = Boolean(features?.MONTH_CLOSE_ENABLED);
  const canReadMonthClose = permissions.includes('GOV_MONTH_CLOSE_READ');
  const canReadAudit = permissions.includes('GOV_AUDIT_READ');

  const canIdentityWrite = permissions.includes('EMPLOYEE_WRITE');
  const canCompWrite = permissions.includes('EMPLOYEE_COMPENSATION_WRITE');
  const canDocWrite = permissions.includes('EMPLOYEE_DOCUMENT_WRITE');

  const canSeeCompensationAction = roles.includes('HR_ADMIN') || roles.includes('FINANCE_ADMIN') || roles.includes('FOUNDER');

  const canReadAttendance = permissions.includes('ATTENDANCE_READ');
  const canReadTimesheet = permissions.includes('TIMESHEET_READ');
  const timesheetEnabledRaw = systemConfig?.TIMESHEET_ENABLED?.value ?? systemConfig?.TIMESHEET_ENABLED;
  const timesheetEnabled = ['true', '1', 'yes', 'enabled', 'on'].includes(String(timesheetEnabledRaw ?? '').trim().toLowerCase());

  const divisions = usePagedQuery({ path: '/api/v1/governance/divisions', page: 1, pageSize: 200, enabled: true });

  const divisionsById = useMemo(() => {
    const items = divisions.data?.items || [];
    const map = {};
    for (const d of items) map[d.id] = d;
    return map;
  }, [divisions.data]);

  const [empState, setEmpState] = useState({ status: 'idle', data: null, error: null, refreshIndex: 0 });
  const refreshEmployee = () => setEmpState((s) => ({ ...s, refreshIndex: s.refreshIndex + 1 }));

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!employeeId) {
        setEmpState({ status: 'error', data: null, error: { message: 'Missing employee id' }, refreshIndex: 0 });
        return;
      }

      setEmpState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        const payload = await apiFetch(`/api/v1/employees/${employeeId}`);
        if (!alive) return;
        setEmpState((s) => ({ ...s, status: 'ready', data: payload, error: null }));
      } catch (err) {
        if (!alive) return;
        setEmpState((s) => ({ ...s, status: 'error', error: err }));
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [employeeId, empState.refreshIndex]);

  const employee = empState.data?.item || null;
  const employeeDivision = employee?.primaryDivisionId ? divisionsById[employee.primaryDivisionId] : null;
  const divisionColor = employeeDivision?.color || '#3B82F6';

  const SYSTEM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COREOPS_ADMIN'];
  const FUNCTIONAL_ROLES = ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'FINANCE_ADMIN'];
  const currentUserSystemRoles = (roles || []).filter((r) => SYSTEM_ROLES.includes(r));
  const canEditRestrictedFunctional = currentUserSystemRoles.includes('SUPER_ADMIN') || currentUserSystemRoles.includes('ADMIN');

  const employeeSystemRoles = (employee?.systemRoles || []).filter((r) => SYSTEM_ROLES.includes(r));
  const employeeFunctionalRoles = (employee?.functionalRoles || []).filter((r) => FUNCTIONAL_ROLES.includes(r));

  const [rolesEditMode, setRolesEditMode] = useState(false);
  const [rolesDraft, setRolesDraft] = useState(['EMPLOYEE']);
  const [rolesError, setRolesError] = useState('');

  useEffect(() => {
    const base = Array.isArray(employeeFunctionalRoles) ? employeeFunctionalRoles : [];
    const next = Array.from(new Set([...base, 'EMPLOYEE'])).filter((r) => FUNCTIONAL_ROLES.includes(r));
    setRolesDraft(next);
    setRolesEditMode(false);
    setRolesError('');
  }, [employeeId, empState.refreshIndex, employee?.id]);

  function toggleDraftRole(roleName) {
    if (roleName === 'EMPLOYEE') return;
    setRolesDraft((prev) => {
      const set = new Set(Array.isArray(prev) ? prev : []);
      if (set.has(roleName)) set.delete(roleName);
      else set.add(roleName);
      set.add('EMPLOYEE');
      return Array.from(set).filter((r) => FUNCTIONAL_ROLES.includes(r));
    });
  }

  const monthKey = useMemo(() => toMonthEndIso(new Date()), []);
  const monthClose = usePagedQuery({
    path: '/api/v1/governance/month-close',
    page: 1,
    pageSize: 200,
    enabled: monthCloseEnabled && canReadMonthClose
  });

  const closedMonthSet = useMemo(() => {
    const set = new Set();
    for (const row of monthClose.data?.items || []) {
      const m = row?.monthEnd || row?.monthStart || row?.month;
      if (!m) continue;
      if (String(row?.status || '').toUpperCase() !== 'CLOSED') continue;
      set.add(String(m).slice(0, 10));
    }
    return set;
  }, [monthClose.data]);

  const isMonthClosed = Boolean(monthKey && monthCloseEnabled && canReadMonthClose && closedMonthSet.has(monthKey));
  const readOnlyMode = isMonthClosed;

  const canEditRoles = canIdentityWrite && !readOnlyMode;

  const updateRolesMutation = useMutation(async ({ id, payload }) => {
    return apiFetch(`/api/v1/employees/${id}`, { method: 'PATCH', body: payload });
  });

  const [compState, setCompState] = useState({ status: 'idle', data: null, error: null, refreshIndex: 0 });
  const refreshComp = () => setCompState((s) => ({ ...s, refreshIndex: s.refreshIndex + 1 }));

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!employeeId) return;
      setCompState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        const payload = await apiFetch(`/api/v1/employees/${employeeId}/compensation`);
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
  }, [employeeId, compState.refreshIndex]);

  const compItems = compState.data?.items || compState.data?.item || compState.data?.data || compState.data?.versions || compState.data?.history || [];
  const compList = Array.isArray(compItems) ? compItems : [];

  const [docState, setDocState] = useState({ status: 'idle', data: null, error: null, refreshIndex: 0 });
  const refreshDocs = () => setDocState((s) => ({ ...s, refreshIndex: s.refreshIndex + 1 }));

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!employeeId) return;
      setDocState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        const payload = await apiFetch(`/api/v1/employees/${employeeId}/documents`);
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
  }, [employeeId, docState.refreshIndex]);

  const docItems = docState.data?.items || docState.data?.documents || [];

  const auditPath = useMemo(() => {
    if (!employeeId) return '';
    const u = new URL('/api/v1/governance/audit', 'http://local');
    u.searchParams.set('entityType', 'EMPLOYEE');
    u.searchParams.set('entityId', employeeId);
    return u.pathname + u.search;
  }, [employeeId]);

  const auditList = usePagedQuery({ path: auditPath || '/api/v1/governance/audit', page: 1, pageSize: 50, enabled: Boolean(auditPath) && canReadAudit });
  const auditItems = auditList.data?.items || [];

  const scopeHistoryItems = useMemo(() => {
    return auditItems.filter((x) => String(x.action || '').toUpperCase().includes('SCOPE'));
  }, [auditItems]);

  const updateIdentityMutation = useMutation(async ({ id, payload }) => {
    return apiFetch(`/api/v1/employees/${id}`, { method: 'PATCH', body: payload });
  });

  const changeScopeMutation = useMutation(async ({ id, payload }) => {
    return apiFetch(`/api/v1/employees/${id}/change-scope`, { method: 'POST', body: payload });
  });

  const addCompMutation = useMutation(async ({ id, payload }) => {
    return apiFetch(`/api/v1/employees/${id}/compensation`, { method: 'POST', body: payload });
  });

  const uploadDocMutation = useMutation(async ({ id, payload }) => {
    return apiFetch(`/api/v1/employees/${id}/documents`, { method: 'POST', body: payload });
  });

  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [idFirstName, setIdFirstName] = useState('');
  const [idLastName, setIdLastName] = useState('');
  const [idPhone, setIdPhone] = useState('');
  const [idDesignation, setIdDesignation] = useState('');
  const [idReportingManager, setIdReportingManager] = useState('');
  const [idReason, setIdReason] = useState('');
  const [idConfirmText, setIdConfirmText] = useState('');

  const openIdentityModal = () => {
    if (!employee) return;
    setIdFirstName(employee.firstName || '');
    setIdLastName(employee.lastName || '');
    setIdPhone(employee.phone || '');
    setIdDesignation(employee.designation || '');
    setIdReportingManager(employee.reportingManagerId || '');
    setIdReason('');
    setIdConfirmText('');
    setIdentityModalOpen(true);
  };

  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [scopeNext, setScopeNext] = useState('COMPANY');
  const [scopeNextDivisionId, setScopeNextDivisionId] = useState('');
  const [scopeReason, setScopeReason] = useState('');

  const openScopeModal = () => {
    if (!employee) return;
    setScopeNext(employee.scope || 'COMPANY');
    setScopeNextDivisionId(employee.primaryDivisionId || '');
    setScopeReason('');
    setScopeModalOpen(true);
  };

  const [compModalOpen, setCompModalOpen] = useState(false);
  const [compFrequency, setCompFrequency] = useState('MONTHLY');
  const [compAmount, setCompAmount] = useState('');
  const [compCurrency, setCompCurrency] = useState('USD');
  const [compEffectiveFrom, setCompEffectiveFrom] = useState('');
  const [compEffectiveTo, setCompEffectiveTo] = useState('');
  const [compReason, setCompReason] = useState('');

  const openCompModal = () => {
    setCompFrequency('MONTHLY');
    setCompAmount('');
    setCompCurrency('USD');
    setCompEffectiveFrom('');
    setCompEffectiveTo('');
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

  if (empState.status === 'loading' && !empState.data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
          <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <img src="/image.png" alt="JASIQ" className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10" />
                <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
              </div>
              <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
                <span className="text-white">Governance</span>
                <span className="mx-2">·</span>
                <span className="text-amber-400">Employees</span>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-16 bg-white border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-xl font-semibold text-slate-900">Employee Profile</h1>
            <p className="text-sm text-slate-600">Employment record and financial scope</p>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-10">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <LoadingState message="Loading employee…" />
          </div>
        </div>
      </div>
    );
  }

  if (empState.status === 'error') {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
          <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <img src="/image.png" alt="JASIQ" className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10" />
                <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
              </div>
              <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
                <span className="text-white">Governance</span>
                <span className="mx-2">·</span>
                <span className="text-amber-400">Employees</span>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-16 bg-white border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-xl font-semibold text-slate-900">Employee Profile</h1>
            <p className="text-sm text-slate-600">Employment record and financial scope</p>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-10">
          {empState.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={empState.error} />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
        <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <img src="/image.png" alt="JASIQ" className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10" />
              <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
            </div>
            <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
              <span className="text-white">Governance</span>
              <span className="mx-2">·</span>
              <span className="text-amber-400">Employees</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-16 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/admin/employees')}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Employees
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Employee Profile</h1>
                <p className="text-sm text-slate-600">Employment record and financial scope</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {readOnlyMode ? (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-semibold text-amber-900">Month is closed. Employee changes are read-only.</div>
            <div className="mt-1 text-sm text-amber-800">All changes require the month to be open.</div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Overview</div>
                  <div className="mt-1 text-xs text-slate-500">Identity fields are audited. Employee ID is immutable.</div>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                  disabled={!canIdentityWrite || readOnlyMode}
                  onClick={openIdentityModal}
                >
                  Edit Identity
                </button>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-slate-500">Employee ID</div>
                  <div className="mt-1 font-mono text-sm text-slate-500">{employee?.employeeCode || '—'}</div>
                  <div className="mt-1 text-xs text-slate-500">Employee ID is immutable</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Status</div>
                  <div className="mt-1">{statusBadge(employee?.status)}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Joining Date</div>
                  <div className="mt-1 text-sm text-slate-700">{employee?.createdAt ? new Date(employee.createdAt).toLocaleDateString() : '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Full Name</div>
                  <div className="mt-1 text-sm text-slate-900">{formatName(employee)}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Email</div>
                  <div className="mt-1 text-sm text-slate-700">{employee?.email || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Phone</div>
                  <div className="mt-1 text-sm text-slate-700">{employee?.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Designation</div>
                  <div className="mt-1 text-sm text-slate-700">{employee?.designation || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Reporting Manager</div>
                  <div className="mt-1 text-sm text-slate-700">{employee?.reportingManagerName || employee?.reportingManager || employee?.reportingManagerId || '—'}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Employment Scope</div>
                  <div className="mt-1 text-xs text-slate-500">Scope changes are append-only and require a reason.</div>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                  disabled={!canIdentityWrite || readOnlyMode}
                  onClick={openScopeModal}
                >
                  Change Scope
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {scopeBadge(employee?.scope, divisionColor)}
                  {employee?.scope === 'DIVISION' ? <span className="text-sm text-slate-700">{formatDivisionLabel(divisionsById, employee?.primaryDivisionId)}</span> : null}
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Effective From</div>
                  <div className="mt-1 text-sm text-slate-700">{employee?.scopeEffectiveFrom || employee?.scopeEffectiveAt || employee?.updatedAt || employee?.createdAt ? new Date(employee?.scopeEffectiveFrom || employee?.scopeEffectiveAt || employee?.updatedAt || employee?.createdAt).toLocaleDateString() : '—'}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="text-sm font-medium text-amber-900">This scope affects financial reporting and payroll allocation.</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Scope History</div>
                  <div className="mt-1 text-xs text-slate-500">History is never overwritten.</div>
                </div>
              </div>
              <div className="p-4">
                {!canReadAudit ? (
                  <EmptyState title="Audit access required" description="You do not have GOV_AUDIT_READ permission." />
                ) : auditList.status === 'loading' && !auditList.data ? (
                  <LoadingState message="Loading scope history…" />
                ) : auditList.status === 'error' ? (
                  <ErrorState error={auditList.error} />
                ) : scopeHistoryItems.length === 0 ? (
                  <EmptyState title="No scope history" description="Scope changes will appear here." />
                ) : (
                  <div className="space-y-3">
                    {scopeHistoryItems.map((h) => (
                      <div key={h.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{String(h.action || 'UPDATE')}</div>
                            <div className="mt-1 text-xs text-slate-600">{h.createdAt ? new Date(h.createdAt).toLocaleString() : '—'}</div>
                          </div>
                          <div className="text-xs text-slate-600">Actor: {h.actorId || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Compensation History</div>
                  <div className="mt-1 text-xs text-slate-500">New versions only. Never overwrite existing entries.</div>
                </div>
                <button
                    type="button"
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-200"
                    disabled={readOnlyMode}
                    title={readOnlyMode ? 'Compensation changes are locked due to month close' : undefined}
                    onClick={openCompModal}
                  >
                    Add New Compensation Version
                  </button>
              </div>
                <div className="p-4">
                  {compState.status === 'loading' && !compState.data ? (
                    <LoadingState message="Loading compensation…" />
                  ) : compState.status === 'error' ? (
                    <ErrorState error={compState.error} />
                  ) : compList.length === 0 ? (
                    <EmptyState title="No compensation history" description="Compensation versions will appear here." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Salary Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Currency</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Effective From</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Effective To</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {compList.map((c) => (
                            <tr key={c.id || `${c.effectiveFrom}-${c.amount}`}
                              className="text-sm text-slate-700"
                            >
                              <td className="px-4 py-3">{c.frequency || c.salaryType || '—'}</td>
                              <td className="px-4 py-3 font-mono">{c.amount != null ? String(c.amount) : '—'}</td>
                              <td className="px-4 py-3">{c.currency || '—'}</td>
                              <td className="px-4 py-3">{c.effectiveFrom ? String(c.effectiveFrom).slice(0, 10) : '—'}</td>
                              <td className="px-4 py-3">{c.effectiveTo ? String(c.effectiveTo).slice(0, 10) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Documents</div>
                  <div className="mt-1 text-xs text-slate-500">Uploads are audited. Reason required.</div>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                  disabled={!canDocWrite || readOnlyMode}
                  onClick={openDocModal}
                >
                  Upload Metadata
                </button>
              </div>
              <div className="p-4">
                {docState.status === 'loading' && !docState.data ? (
                  <LoadingState message="Loading documents…" />
                ) : docState.status === 'error' ? (
                  <ErrorState error={docState.error} />
                ) : (docItems || []).length === 0 ? (
                  <EmptyState title="No documents" description="Uploaded documents will appear here." />
                ) : (
                  <div className="space-y-2">
                    {(docItems || []).map((d) => (
                      <div key={d.id || d.storageKey} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{d.type || d.docType || 'Document'}</div>
                            <div className="mt-1 text-xs text-slate-600">{d.fileName || d.filename || d.storageKey || '—'}</div>
                          </div>
                          <div className="text-xs text-slate-500">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200">
                <div className="text-sm font-semibold text-slate-900">Attendance & Timesheets</div>
                <div className="mt-1 text-xs text-slate-500">Read-only summaries and safe links to modules.</div>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-slate-500">Attendance</div>
                  <div className="mt-1 text-sm text-slate-700">{canReadAttendance ? 'Available' : 'Not accessible'}</div>
                  {canReadAttendance ? (
                    <div className="mt-2">
                      <Link className="text-sm font-medium text-slate-900 underline" to="/admin/attendance">Open Attendance</Link>
                    </div>
                  ) : null}
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Timesheets</div>
                  <div className="mt-1 text-sm text-slate-700">{timesheetEnabled && canReadTimesheet ? 'Available' : 'Not accessible'}</div>
                  {timesheetEnabled && canReadTimesheet ? (
                    <div className="mt-2">
                      <Link className="text-sm font-medium text-slate-900 underline" to="/timesheet/approvals">Open Timesheets</Link>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Roles &amp; Access</div>
                  <div className="mt-1 text-xs text-slate-500">Functional roles control access to day-to-day operations.</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                    disabled={!canEditRoles || rolesEditMode}
                    onClick={() => {
                      setRolesDraft(Array.from(new Set([...(employeeFunctionalRoles || []), 'EMPLOYEE'])));
                      setRolesEditMode(true);
                      setRolesError('');
                    }}
                    title={!canEditRoles ? 'You do not have permission to edit roles or the month is closed' : undefined}
                  >
                    Edit Roles
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <div className="text-xs font-medium text-slate-500">System Roles</div>
                  <div className="mt-1 text-xs text-slate-500">System roles are managed via Admin Management and cannot be edited here.</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(employeeSystemRoles.length ? employeeSystemRoles : ['—']).map((r) => (
                      <span key={r} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="text-xs font-medium text-slate-500">Functional Roles</div>
                  <div className="mt-1 text-xs text-slate-500">Functional roles control attendance, approvals, payroll, and daily operations.</div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <input type="checkbox" checked={true} disabled />
                      <span className="font-medium">Employee</span>
                    </label>

                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={(rolesEditMode ? rolesDraft : employeeFunctionalRoles).includes('MANAGER')}
                        disabled={!rolesEditMode || !canEditRoles}
                        onChange={() => toggleDraftRole('MANAGER')}
                      />
                      <span className="font-medium">Manager</span>
                    </label>

                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={(rolesEditMode ? rolesDraft : employeeFunctionalRoles).includes('HR_ADMIN')}
                        disabled={!rolesEditMode || !canEditRoles || !canEditRestrictedFunctional}
                        onChange={() => toggleDraftRole('HR_ADMIN')}
                      />
                      <span className="font-medium">HR Admin</span>
                    </label>

                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={(rolesEditMode ? rolesDraft : employeeFunctionalRoles).includes('FINANCE_ADMIN')}
                        disabled={!rolesEditMode || !canEditRoles || !canEditRestrictedFunctional}
                        onChange={() => toggleDraftRole('FINANCE_ADMIN')}
                      />
                      <span className="font-medium">Finance Admin</span>
                    </label>
                  </div>

                  {!canEditRestrictedFunctional ? (
                    <div className="mt-2 text-xs text-slate-500">HR Admin and Finance Admin require SUPER_ADMIN or ADMIN system role.</div>
                  ) : null}

                  {rolesError ? <div className="mt-2 text-xs text-rose-700">{rolesError}</div> : null}

                  {rolesEditMode ? (
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setRolesDraft(Array.from(new Set([...(employeeFunctionalRoles || []), 'EMPLOYEE'])));
                          setRolesEditMode(false);
                          setRolesError('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-200"
                        disabled={!employeeId || updateRolesMutation.status === 'loading'}
                        onClick={async () => {
                          const normalized = Array.from(new Set([...(rolesDraft || []), 'EMPLOYEE'])).filter((r) => FUNCTIONAL_ROLES.includes(r));
                          if (normalized.length === 0) {
                            setRolesError('At least one functional role is required.');
                            return;
                          }
                          if (!normalized.includes('EMPLOYEE')) {
                            setRolesError('EMPLOYEE is required.');
                            return;
                          }

                          setRolesError('');
                          await updateRolesMutation.run({ id: employeeId, payload: { roles: normalized } });
                          setRolesEditMode(false);
                          refreshEmployee();
                        }}
                      >
                        Save Roles
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-6 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                      {employee ? initialsFromEmployee(employee) : '—'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{employee ? formatName(employee) : '—'}</div>
                      <div className="mt-1 text-xs text-slate-500">{employee?.employeeCode || '—'}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {statusBadge(employee?.status)}
                    {scopeBadge(employee?.scope, divisionColor)}
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <div className="text-xs font-medium text-slate-500">Employment scope impact</div>
                    <div className="mt-1 text-sm text-slate-700">
                      {employee?.scope === 'DIVISION'
                        ? 'This employee is a DIVISION resource. Costs impact division P&L.'
                        : 'This employee is a COMPANY resource. Costs roll up to company overhead.'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500">Payroll & P&L implications</div>
                    <div className="mt-1 text-sm text-slate-700">Compensation versions must be append-only for audit and payroll accuracy.</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500">Month Close locking behavior</div>
                    <div className="mt-1 text-sm text-slate-700">When the month is closed, employee changes are read-only to protect financial reporting.</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500">Audit notes</div>
                    <div className="mt-1 text-sm text-slate-700">Sensitive actions require reason and are recorded in Audit Logs.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {identityModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setIdentityModalOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-900">Edit Identity</div>
                <div className="mt-1 text-sm text-slate-600">Changes require confirmation and a reason. Employee ID cannot be changed.</div>
              </div>
              <button type="button" className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700" onClick={() => setIdentityModalOpen(false)}>
                <Icon name="x" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">First Name</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={idFirstName} onChange={(e) => setIdFirstName(e.target.value)} disabled={readOnlyMode} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Last Name</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={idLastName} onChange={(e) => setIdLastName(e.target.value)} disabled={readOnlyMode} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Phone</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={idPhone} onChange={(e) => setIdPhone(e.target.value)} disabled={readOnlyMode} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Designation</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={idDesignation} onChange={(e) => setIdDesignation(e.target.value)} disabled={readOnlyMode} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Reporting Manager</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={idReportingManager} onChange={(e) => setIdReportingManager(e.target.value)} disabled={readOnlyMode} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Reason (required)</label>
                <textarea className="mt-1 w-full h-24 rounded-md border-slate-300 text-sm" value={idReason} onChange={(e) => setIdReason(e.target.value)} disabled={readOnlyMode} />
                {idReason.trim().length === 0 ? <div className="mt-1 text-xs text-rose-700">Reason is required.</div> : null}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Type CONFIRM to apply</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono" value={idConfirmText} onChange={(e) => setIdConfirmText(e.target.value)} disabled={readOnlyMode} />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setIdentityModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-200"
                disabled={
                  readOnlyMode ||
                  updateIdentityMutation.status === 'loading' ||
                  idReason.trim().length === 0 ||
                  idConfirmText.trim() !== 'CONFIRM' ||
                  !employeeId
                }
                onClick={async () => {
                  const payload = {
                    firstName: idFirstName.trim() || null,
                    lastName: idLastName.trim() || null,
                    phone: idPhone.trim() || null,
                    designation: idDesignation.trim() || null,
                    reportingManager: idReportingManager.trim() || null,
                    reason: idReason.trim()
                  };
                  await updateIdentityMutation.run({ id: employeeId, payload });
                  setIdentityModalOpen(false);
                  refreshEmployee();
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {scopeModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setScopeModalOpen(false)} />
          <div className="relative w-full max-w-xl rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-900">Change Scope</div>
                <div className="mt-1 text-sm text-slate-600">Scope changes are append-only and require a reason.</div>
              </div>
              <button type="button" className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700" onClick={() => setScopeModalOpen(false)}>
                <Icon name="x" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Scope</label>
                <select className="mt-1 w-full rounded-md border-slate-300 text-sm" value={scopeNext} onChange={(e) => setScopeNext(e.target.value)} disabled={readOnlyMode}>
                  <option value="COMPANY">COMPANY (Shared)</option>
                  <option value="DIVISION">DIVISION</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Division</label>
                <select
                  className="mt-1 w-full rounded-md border-slate-300 text-sm disabled:bg-slate-50"
                  value={scopeNextDivisionId}
                  onChange={(e) => setScopeNextDivisionId(e.target.value)}
                  disabled={readOnlyMode || scopeNext !== 'DIVISION'}
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
                <textarea className="mt-1 w-full h-24 rounded-md border-slate-300 text-sm" value={scopeReason} onChange={(e) => setScopeReason(e.target.value)} disabled={readOnlyMode} />
                <div className="mt-1 text-xs text-slate-500">Reason is required and will be recorded in Audit Logs</div>
                {scopeReason.trim().length === 0 ? <div className="mt-1 text-xs text-rose-700">Reason is required.</div> : null}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setScopeModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-200"
                disabled={readOnlyMode || changeScopeMutation.status === 'loading' || !employeeId || scopeReason.trim().length === 0 || (scopeNext === 'DIVISION' && !scopeNextDivisionId)}
                onClick={async () => {
                  await changeScopeMutation.run({
                    id: employeeId,
                    payload: {
                      scope: scopeNext,
                      primaryDivisionId: scopeNext === 'DIVISION' ? scopeNextDivisionId : null,
                      reason: scopeReason.trim()
                    }
                  });
                  setScopeModalOpen(false);
                  refreshEmployee();
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {compModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setCompModalOpen(false)} />
          <div className="relative w-full max-w-xl rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-900">Add Compensation Version</div>
                <div className="mt-1 text-sm text-slate-600">Reason is required. Existing entries cannot be edited.</div>
              </div>
              <button type="button" className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700" onClick={() => setCompModalOpen(false)}>
                <Icon name="x" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Salary Type</label>
                <select className="mt-1 w-full rounded-md border-slate-300 text-sm" value={compFrequency} onChange={(e) => setCompFrequency(e.target.value)} disabled={readOnlyMode}>
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="HOURLY">HOURLY</option>
                  <option value="ANNUAL">ANNUAL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Currency</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={compCurrency} onChange={(e) => setCompCurrency(e.target.value)} disabled={readOnlyMode} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Amount</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono" value={compAmount} onChange={(e) => setCompAmount(e.target.value)} disabled={readOnlyMode} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Effective From</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" type="date" value={compEffectiveFrom} onChange={(e) => setCompEffectiveFrom(e.target.value)} disabled={readOnlyMode} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Effective To (optional)</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" type="date" value={compEffectiveTo} onChange={(e) => setCompEffectiveTo(e.target.value)} disabled={readOnlyMode} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Reason (required)</label>
                <textarea className="mt-1 w-full h-24 rounded-md border-slate-300 text-sm" value={compReason} onChange={(e) => setCompReason(e.target.value)} disabled={readOnlyMode} />
                <div className="mt-1 text-xs text-slate-500">Reason is required and will be recorded in Audit Logs</div>
                {compReason.trim().length === 0 ? <div className="mt-1 text-xs text-rose-700">Reason is required.</div> : null}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setCompModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-200"
                disabled={readOnlyMode || addCompMutation.status === 'loading' || !employeeId || compReason.trim().length === 0 || compEffectiveFrom.trim().length === 0 || compAmount.trim().length === 0}
                onClick={async () => {
                  await addCompMutation.run({
                    id: employeeId,
                    payload: {
                      amount: Number(compAmount),
                      currency: compCurrency.trim().toUpperCase(),
                      frequency: compFrequency,
                      effectiveFrom: compEffectiveFrom,
                      effectiveTo: compEffectiveTo.trim() || null,
                      reason: compReason.trim()
                    }
                  });
                  setCompModalOpen(false);
                  refreshComp();
                }}
              >
                Add Version
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {docModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDocModalOpen(false)} />
          <div className="relative w-full max-w-xl rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-900">Upload Document Metadata</div>
                <div className="mt-1 text-sm text-slate-600">This registers a document reference for audit. A reason is required.</div>
              </div>
              <button type="button" className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700" onClick={() => setDocModalOpen(false)}>
                <Icon name="x" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Type</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={docType} onChange={(e) => setDocType(e.target.value)} disabled={readOnlyMode} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">File Name</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={docFileName} onChange={(e) => setDocFileName(e.target.value)} disabled={readOnlyMode} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Storage Key</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono" value={docStorageKey} onChange={(e) => setDocStorageKey(e.target.value)} disabled={readOnlyMode} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">MIME Type</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={docMimeType} onChange={(e) => setDocMimeType(e.target.value)} disabled={readOnlyMode} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Size (bytes)</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono" value={docSizeBytes} onChange={(e) => setDocSizeBytes(e.target.value)} disabled={readOnlyMode} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Reason (required)</label>
                <textarea className="mt-1 w-full h-24 rounded-md border-slate-300 text-sm" value={docReason} onChange={(e) => setDocReason(e.target.value)} disabled={readOnlyMode} />
                <div className="mt-1 text-xs text-slate-500">Reason is required and will be recorded in Audit Logs</div>
                {docReason.trim().length === 0 ? <div className="mt-1 text-xs text-rose-700">Reason is required.</div> : null}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setDocModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-200"
                disabled={readOnlyMode || uploadDocMutation.status === 'loading' || !employeeId || !canDocWrite || docReason.trim().length === 0 || docType.trim().length === 0 || docStorageKey.trim().length === 0}
                onClick={async () => {
                  await uploadDocMutation.run({
                    id: employeeId,
                    payload: {
                      type: docType.trim(),
                      fileName: docFileName.trim() || null,
                      storageKey: docStorageKey.trim(),
                      mimeType: docMimeType.trim() || null,
                      sizeBytes: docSizeBytes.trim() ? Number(docSizeBytes) : null,
                      reason: docReason.trim()
                    }
                  });
                  setDocModalOpen(false);
                  refreshDocs();
                }}
              >
                Register
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
