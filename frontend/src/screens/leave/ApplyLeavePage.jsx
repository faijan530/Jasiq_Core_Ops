import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
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

function parseIntConfig(v, fallback) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function isoTodayLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysIso(yyyyMmDd, deltaDays) {
  const d = new Date(`${yyyyMmDd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function calcFullDayUnits(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const s = new Date(`${String(startDate).slice(0, 10)}T00:00:00.000Z`);
  const e = new Date(`${String(endDate).slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  if (s.getTime() > e.getTime()) return 0;
  const days = Math.floor((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return days;
}

export function ApplyLeavePage() {
  const navigate = useNavigate();
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];
  const canCreate = permissions.includes('LEAVE_REQUEST_CREATE');
  const canReadTypes = permissions.includes('LEAVE_TYPE_READ');
  const canUploadAttachment = permissions.includes('LEAVE_ATTACHMENT_UPLOAD');
  const canRead = permissions.includes('LEAVE_BALANCE_READ');

  const systemConfig = bootstrap?.systemConfig || {};
  const leaveEnabled = isTruthyConfig(systemConfig?.LEAVE_ENABLED?.value ?? systemConfig?.LEAVE_ENABLED);
  const allowHalfDay = isTruthyConfig(systemConfig?.LEAVE_ALLOW_HALF_DAY?.value ?? systemConfig?.LEAVE_ALLOW_HALF_DAY);
  const allowBackdated = isTruthyConfig(systemConfig?.LEAVE_ALLOW_BACKDATED_REQUESTS?.value ?? systemConfig?.LEAVE_ALLOW_BACKDATED_REQUESTS);
  const backdateLimitDays = parseIntConfig(systemConfig?.LEAVE_BACKDATE_LIMIT_DAYS?.value ?? systemConfig?.LEAVE_BACKDATE_LIMIT_DAYS, 0);
  const attachmentsEnabled = isTruthyConfig(systemConfig?.LEAVE_ATTACHMENTS_ENABLED?.value ?? systemConfig?.LEAVE_ATTACHMENTS_ENABLED);

  const employeeId = bootstrap?.user?.id || null;

  const today = useMemo(() => isoTodayLocal(), []);
  const minStart = useMemo(() => {
    if (!allowBackdated) return today;
    const limit = Number.isFinite(backdateLimitDays) ? backdateLimitDays : 0;
    if (limit > 0) return addDaysIso(today, -1 * limit);
    return '';
  }, [allowBackdated, backdateLimitDays, today]);

  const types = usePagedQuery({
    path: '/api/v1/leave/types',
    page: 1,
    pageSize: 200,
    enabled: leaveEnabled && canReadTypes
  });

  const typeItems = types.data?.items || [];

  const balances = usePagedQuery({
    path: `/api/v1/leave/balances?employeeId=${encodeURIComponent(employeeId || '')}`,
    page: 1,
    pageSize: 200,
    enabled: leaveEnabled && canRead && Boolean(employeeId)
  });

  const balanceItems = balances.data?.items || [];

  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [unit, setUnit] = useState('FULL_DAY');
  const [halfDayPart, setHalfDayPart] = useState('AM');
  const [reason, setReason] = useState('');

  const [attFileName, setAttFileName] = useState('');
  const [attStorageKey, setAttStorageKey] = useState('');
  const [attMimeType, setAttMimeType] = useState('');
  const [attSizeBytes, setAttSizeBytes] = useState('');

  const [clientError, setClientError] = useState('');
  const [created, setCreated] = useState(null);

  const selectedType = useMemo(() => {
    return typeItems.find((t) => String(t.id) === String(leaveTypeId)) || null;
  }, [leaveTypeId, typeItems]);

  const supportsHalfDay = Boolean(allowHalfDay && (selectedType?.supportsHalfDay !== false));
  const hasAnyBalance = balanceItems.length > 0;
  const selectedPaidType = selectedType?.isPaid;
  const missingBalanceForSelected = selectedPaidType && !balanceItems.some(b => String(b.leaveTypeId) === String(selectedType?.id));
  const disableDueToMissingBalance = selectedPaidType && !hasAnyBalance;

  const unitsPreview = useMemo(() => {
    if (unit === 'HALF_DAY') return 0.5;
    return calcFullDayUnits(startDate, endDate);
  }, [endDate, startDate, unit]);

  const createMutation = useMutation(async (payload) => {
    return apiFetch('/api/v1/leave/requests', { method: 'POST', body: payload });
  });

  const friendlyError = useMemo(() => {
    if (createMutation.status !== 'error') return null;
    const err = createMutation.error;
    if (!err) return null;
    const status = err?.status;
    const requestId = err?.requestId || '';
    if (status >= 500) {
      return {
        title: 'Unable to submit leave request',
        message: 'Your leave request could not be submitted at this time.\nPlease try again or contact HR/Admin if the problem persists.',
        requestId
      };
    }
    return null;
  }, [createMutation.status, createMutation.error]);

  const uploadAttachmentMutation = useMutation(async ({ id, payload }) => {
    return apiFetch(`/api/v1/leave/requests/${id}/attachments`, { method: 'POST', body: payload });
  });

  const canAttemptAttachment = Boolean(
    attachmentsEnabled &&
      canUploadAttachment &&
      attFileName.trim() &&
      attStorageKey.trim() &&
      attMimeType.trim() &&
      attSizeBytes.trim()
  );

  const content = useMemo(() => {
    if (!canCreate) return <ForbiddenState />;

    if (!leaveEnabled) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-sm font-medium text-slate-900">Leave is disabled</div>
          <div className="mt-1 text-sm text-slate-600">LEAVE_ENABLED must be enabled in system config.</div>
        </div>
      );
    }

    if (!employeeId) {
      return <EmptyState title="Missing user context" description="No user id found in bootstrap." />;
    }

    if (!canReadTypes) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-sm font-medium text-slate-900">Leave Types not accessible</div>
          <div className="mt-1 text-sm text-slate-600">You need LEAVE_TYPE_READ permission to apply for leave.</div>
        </div>
      );
    }

    if (types.status === 'loading' && !types.data) return <LoadingState />;

    if (types.status === 'error') {
      return types.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={types.error} />;
    }

    if (typeItems.length === 0) {
      return <EmptyState title="No leave types" description="No active leave types are configured." />;
    }

    const submitting = createMutation.status === 'loading' || uploadAttachmentMutation.status === 'loading';

    return (
      <div className="space-y-4">
        {disableDueToMissingBalance ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-semibold text-amber-900">Leave balance is not configured for you</div>
            <div className="mt-1 text-sm text-amber-800">Please contact HR/Admin to set up your leave balance before submitting paid leave requests.</div>
          </div>
        ) : null}

        {created ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-sm font-semibold text-emerald-900">Leave request submitted</div>
            <div className="mt-1 text-sm text-emerald-800">Request ID: <span className="font-mono">{created.id}</span></div>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <Link
                to={`/leave/requests/${created.id}`}
                state={{ employeeId, item: created }}
                className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                View request
              </Link>
              <Link
                to="/leave/my"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back to My Leave
              </Link>
            </div>
          </div>
        ) : null}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Apply Leave</div>
              <div className="mt-1 text-xs text-slate-500">Submit a leave request for approval.</div>
            </div>
            <button
              type="button"
              className="w-full sm:w-auto rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Back
            </button>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Leave Type</label>
              <select
                className="mt-1 w-full rounded-md border-slate-300 text-sm"
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                disabled={submitting}
              >
                <option value="">Select…</option>
                {typeItems.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} — {t.name}{t.isPaid ? ' (Paid)' : ''}
                  </option>
                ))}
              </select>
              {selectedType && selectedType.isActive === false ? (
                <div className="mt-1 text-xs text-rose-600">Selected type is inactive.</div>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Unit</label>
              <select
                className="mt-1 w-full rounded-md border-slate-300 text-sm"
                value={unit}
                onChange={(e) => {
                  const next = e.target.value;
                  setUnit(next);
                  if (next === 'HALF_DAY') {
                    if (startDate && endDate && startDate !== endDate) setEndDate(startDate);
                  }
                }}
                disabled={submitting}
              >
                <option value="FULL_DAY">Full day</option>
                <option value="HALF_DAY" disabled={!supportsHalfDay}>
                  Half day
                </option>
              </select>
              {!supportsHalfDay ? (
                <div className="mt-1 text-xs text-slate-500">Half-day is disabled by config or leave type settings.</div>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Start Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border-slate-300 text-sm"
                value={startDate}
                min={minStart || undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  setStartDate(v);
                  if (!endDate || endDate < v) setEndDate(v);
                  if (unit === 'HALF_DAY') setEndDate(v);
                }}
                disabled={submitting}
              />
              {!allowBackdated ? (
                <div className="mt-1 text-xs text-slate-500">Backdated requests are disabled.</div>
              ) : backdateLimitDays > 0 ? (
                <div className="mt-1 text-xs text-slate-500">Backdate limit: {backdateLimitDays} day(s).</div>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">End Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border-slate-300 text-sm"
                value={endDate}
                min={startDate || minStart || undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  setEndDate(v);
                  if (unit === 'HALF_DAY') {
                    setStartDate(v);
                  }
                }}
                disabled={submitting || unit === 'HALF_DAY'}
              />
              {unit === 'HALF_DAY' ? (
                <div className="mt-1 text-xs text-slate-500">Half-day requests are single-day only.</div>
              ) : null}
            </div>

            {unit === 'HALF_DAY' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700">Half-day Part</label>
                <select
                  className="mt-1 w-full rounded-md border-slate-300 text-sm"
                  value={halfDayPart}
                  onChange={(e) => setHalfDayPart(e.target.value)}
                  disabled={submitting}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            ) : (
              <div />
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Reason</label>
              <textarea
                className="mt-1 w-full rounded-md border-slate-300 text-sm"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting}
                placeholder="Provide a clear reason for this leave request"
              />
            </div>

            <div className="md:col-span-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-medium text-slate-900">Summary</div>
                <div className="mt-1 text-sm text-slate-700">
                  <span className="font-mono">{startDate || '—'} → {endDate || '—'}</span>
                  <span className="mx-2">|</span>
                  Units: <span className="font-semibold">{unit === 'HALF_DAY' ? '0.5' : String(unitsPreview || 0)}</span>
                </div>
                {selectedType?.isPaid ? (
                  <div className="mt-1 text-xs text-slate-600">Paid leave: sufficient balance will be validated by the backend.</div>
                ) : (
                  <div className="mt-1 text-xs text-slate-600">Unpaid leave: balance checks may not apply.</div>
                )}
              </div>
            </div>

            {attachmentsEnabled ? (
              <div className="md:col-span-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Attachment (optional)</div>
                  <div className="mt-1 text-xs text-slate-500">Provide a signed URL as storageKey. File upload is metadata-only.</div>

                  {!canUploadAttachment ? (
                    <div className="mt-2 text-xs text-slate-600">You do not have LEAVE_ATTACHMENT_UPLOAD permission.</div>
                  ) : (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">File Name</label>
                        <input
                          className="mt-1 w-full rounded-md border-slate-300 text-sm"
                          value={attFileName}
                          onChange={(e) => setAttFileName(e.target.value)}
                          disabled={submitting}
                          placeholder="medical_certificate.pdf"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">MIME Type</label>
                        <input
                          className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono"
                          value={attMimeType}
                          onChange={(e) => setAttMimeType(e.target.value)}
                          disabled={submitting}
                          placeholder="application/pdf"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700">Storage Key (signed URL)</label>
                        <input
                          className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono"
                          value={attStorageKey}
                          onChange={(e) => setAttStorageKey(e.target.value)}
                          disabled={submitting}
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Size Bytes</label>
                        <input
                          className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono"
                          value={attSizeBytes}
                          onChange={(e) => setAttSizeBytes(e.target.value)}
                          disabled={submitting}
                          placeholder="12345"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {clientError ? (
              <div className="md:col-span-2">
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{clientError}</div>
              </div>
            ) : null}

            {friendlyError ? (
              <div className="md:col-span-2">
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                  <div className="text-sm font-semibold text-rose-900">{friendlyError.title}</div>
                  <div className="mt-1 text-sm text-rose-800 whitespace-pre-line">{friendlyError.message}</div>
                  {friendlyError.requestId ? (
                    <div className="mt-1 text-xs text-slate-500">Reference ID: {friendlyError.requestId}</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {createMutation.status === 'error' && !friendlyError ? (
              <div className="md:col-span-2">
                <ErrorState error={createMutation.error} />
              </div>
            ) : null}

            {uploadAttachmentMutation.status === 'error' ? (
              <div className="md:col-span-2">
                <ErrorState error={uploadAttachmentMutation.error} />
              </div>
            ) : null}

            <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Link
                to="/leave/my"
                className={cx(
                  'inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px]',
                  submitting ? 'pointer-events-none opacity-70' : ''
                )}
              >
                Cancel
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400 min-h-[44px] w-full sm:w-auto"
                disabled={
                  submitting ||
                  !leaveTypeId ||
                  !startDate ||
                  !endDate ||
                  reason.trim().length === 0 ||
                  (unit === 'HALF_DAY' && (!halfDayPart || startDate !== endDate)) ||
                  disableDueToMissingBalance && selectedPaidType
                }
                onClick={async () => {
                  setClientError('');
                  setCreated(null);

                  const trimmedReason = reason.trim();
                  if (!trimmedReason) {
                    setClientError('Reason is required');
                    return;
                  }

                  if (unit === 'HALF_DAY' && startDate !== endDate) {
                    setClientError('Half-day leave must be for a single date');
                    return;
                  }

                  try {
                    const payload = {
                      employeeId,
                      leaveTypeId,
                      startDate,
                      endDate,
                      unit,
                      halfDayPart: unit === 'HALF_DAY' ? halfDayPart : null,
                      reason: trimmedReason
                    };

                    const res = await createMutation.run(payload);
                    const item = res?.item || null;
                    if (item) setCreated(item);

                    if (item && canAttemptAttachment) {
                      await uploadAttachmentMutation.run({
                        id: item.id,
                        payload: {
                          fileName: attFileName.trim(),
                          storageKey: attStorageKey.trim(),
                          mimeType: attMimeType.trim(),
                          sizeBytes: Number(attSizeBytes)
                        }
                      });
                    }

                    if (item) {
                      navigate(`/leave/requests/${item.id}`, { state: { employeeId, item } });
                    }
                  } catch {
                    // state already set by hooks
                  }
                }}
              >
                {createMutation.status === 'loading' ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [allowBackdated, allowHalfDay, attFileName, attMimeType, attSizeBytes, attStorageKey, attachmentsEnabled, backdateLimitDays, canAttemptAttachment, canCreate, canRead, canReadTypes, canUploadAttachment, clientError, createMutation, created, disableDueToMissingBalance, employeeId, endDate, friendlyError, halfDayPart, hasAnyBalance, leaveEnabled, leaveTypeId, minStart, navigate, reason, selectedPaidType, selectedType, startDate, typeItems, types, unit, unitsPreview, uploadAttachmentMutation]);

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Apply Leave" />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mt-4">{content}</div>
      </div>
    </div>
  );
}
