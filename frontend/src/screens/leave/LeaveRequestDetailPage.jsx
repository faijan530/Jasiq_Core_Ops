import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

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

function statusBadgeClass(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'SUBMITTED') return 'bg-blue-50 text-blue-800';
  if (s === 'APPROVED') return 'bg-emerald-50 text-emerald-800';
  if (s === 'REJECTED') return 'bg-rose-50 text-rose-800';
  if (s === 'CANCELLED') return 'bg-slate-100 text-slate-800';
  return 'bg-slate-100 text-slate-800';
}

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  if (!s) return null;
  return <span className={cx('inline-flex rounded-full px-2 py-1 text-xs font-semibold', statusBadgeClass(s))}>{s}</span>;
}

function fmtDt(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function fmtUnits(units) {
  const n = Number(units || 0);
  if (!Number.isFinite(n)) return '—';
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

export function LeaveRequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];
  const canRead = permissions.includes('LEAVE_REQUEST_READ');
  const canCancelAny = permissions.includes('LEAVE_REQUEST_CANCEL');
  const canApproveL1 = permissions.includes('LEAVE_APPROVE_L1');
  const canApproveL2 = permissions.includes('LEAVE_APPROVE_L2');
  const canReadAttachments = permissions.includes('LEAVE_ATTACHMENT_READ');
  const canUploadAttachments = permissions.includes('LEAVE_ATTACHMENT_UPLOAD');

  const systemConfig = bootstrap?.systemConfig || {};
  const features = bootstrap?.features?.flags || {};

  const leaveEnabled = isTruthyConfig(systemConfig?.LEAVE_ENABLED?.value ?? systemConfig?.LEAVE_ENABLED);
  const attachmentsEnabled = isTruthyConfig(systemConfig?.LEAVE_ATTACHMENTS_ENABLED?.value ?? systemConfig?.LEAVE_ATTACHMENTS_ENABLED);
  const monthCloseEnabled = Boolean(features?.MONTH_CLOSE_ENABLED);

  const [tab, setTab] = useState('details');

  const stateItem = location.state?.item || null;
  const stateEmployeeId = location.state?.employeeId || null;

  const list = usePagedQuery({
    path: stateEmployeeId ? `/api/v1/leave/requests?employeeId=${encodeURIComponent(stateEmployeeId)}` : '/api/v1/leave/requests',
    page: 1,
    pageSize: 200,
    enabled: leaveEnabled && canRead && Boolean(id) && !stateItem
  });

  const item = useMemo(() => {
    if (stateItem && String(stateItem.id) === String(id)) return stateItem;
    const all = list.data?.items || [];
    return all.find((x) => String(x.id) === String(id)) || null;
  }, [id, list.data, stateItem]);

  const monthClose = usePagedQuery({
    path: '/api/v1/governance/month-close',
    page: 1,
    pageSize: 200,
    enabled: monthCloseEnabled && Boolean(item?.startDate || item?.endDate)
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

  const isMonthClosed = useMemo(() => {
    if (!item?.startDate || !item?.endDate) return false;
    const start = new Date(`${item.startDate}T00:00:00.000Z`);
    const end = new Date(`${item.endDate}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

    const cur = new Date(start.getTime());
    while (cur.getTime() <= end.getTime()) {
      const monthEnd = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
      if (closedMonthSet.has(monthEnd)) return true;
      cur.setUTCMonth(cur.getUTCMonth() + 1);
      cur.setUTCDate(1);
    }

    return false;
  }, [closedMonthSet, item?.endDate, item?.startDate]);

  const attachments = usePagedQuery({
    path: id ? `/api/v1/leave/requests/${id}/attachments` : '/api/v1/leave/requests/x/attachments',
    page: 1,
    pageSize: 200,
    enabled: attachmentsEnabled && canReadAttachments && tab === 'attachments' && Boolean(id)
  });

  const cancelMutation = useMutation(async ({ reason }) => {
    return apiFetch(`/api/v1/leave/requests/${id}/cancel`, { method: 'POST', body: { reason } });
  });

  const approveMutation = useMutation(async ({ reason }) => {
    return apiFetch(`/api/v1/leave/requests/${id}/approve`, { method: 'POST', body: { reason: reason || null } });
  });

  const rejectMutation = useMutation(async ({ reason }) => {
    return apiFetch(`/api/v1/leave/requests/${id}/reject`, { method: 'POST', body: { reason } });
  });

  const uploadAttachmentMutation = useMutation(async ({ payload }) => {
    return apiFetch(`/api/v1/leave/requests/${id}/attachments`, { method: 'POST', body: payload });
  });

  const downloadMutation = useMutation(async ({ attId }) => {
    return apiFetch(`/api/v1/leave/requests/${id}/attachments/${attId}/download`);
  });

  const [decisionModal, setDecisionModal] = useState(null); // 'cancel' | 'reject' | 'approve'
  const [decisionReason, setDecisionReason] = useState('');

  const [attModalOpen, setAttModalOpen] = useState(false);
  const [attFileName, setAttFileName] = useState('');
  const [attStorageKey, setAttStorageKey] = useState('');
  const [attMimeType, setAttMimeType] = useState('');
  const [attSizeBytes, setAttSizeBytes] = useState('');

  const status = String(item?.status || '').toUpperCase();

  const isMyOwn = Boolean(item && String(item.employeeId) === String(bootstrap?.user?.id));
  const canCancel = Boolean((isMyOwn || canCancelAny) && status && status !== 'CANCELLED' && status !== 'REJECTED');
  const canApprove = Boolean((canApproveL1 || canApproveL2) && status === 'SUBMITTED');

  const topLoading = Boolean(list.status === 'loading' && !list.data && !stateItem);

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

    if (topLoading) return <LoadingState />;

    if (list.status === 'error') {
      return list.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={list.error} />;
    }

    if (!item) {
      return <EmptyState title="Leave request not found" description="This request may not be accessible in your scope." />;
    }

    const TabButton = ({ id: tabId, label }) => {
      const active = tab === tabId;
      return (
        <button
          type="button"
          className={cx(
            'rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
            active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          )}
          onClick={() => setTab(tabId)}
        >
          {label}
        </button>
      );
    };

    return (
      <div className="space-y-4">
        {isMonthClosed ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-semibold text-amber-900">Month is CLOSED</div>
            <div className="mt-1 text-sm text-amber-800">This request falls within a closed payroll month. Actions may require override permission and a reason.</div>
          </div>
        ) : null}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Leave Request</div>
              <div className="mt-1 text-xs text-slate-500 font-mono">{item.id}</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => navigate(-1)}
              >
                Back
              </button>
              <Link
                to={isMyOwn ? '/leave/my' : '/leave/approvals'}
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Go to list
              </Link>
              {canCancel ? (
                <button
                  type="button"
                  className="w-full sm:w-auto rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400"
                  disabled={cancelMutation.status === 'loading'}
                  onClick={() => {
                    setDecisionReason('');
                    setDecisionModal('cancel');
                  }}
                >
                  Cancel
                </button>
              ) : null}
              {canApprove ? (
                <button
                  type="button"
                  className="w-full sm:w-auto rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                  disabled={approveMutation.status === 'loading'}
                  onClick={() => {
                    setDecisionReason('');
                    setDecisionModal('approve');
                  }}
                >
                  Approve
                </button>
              ) : null}
              {canApprove ? (
                <button
                  type="button"
                  className="w-full sm:w-auto rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:bg-rose-300"
                  disabled={rejectMutation.status === 'loading'}
                  onClick={() => {
                    setDecisionReason('');
                    setDecisionModal('reject');
                  }}
                >
                  Reject
                </button>
              ) : null}
            </div>
          </div>

          <div className="p-4 flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            <div className="text-xs text-slate-500">{item.leaveTypeCode} — {item.leaveTypeName}</div>
          </div>

          <div className="px-4 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <TabButton id="details" label="Details" />
              <TabButton id="attachments" label="Attachments" />
            </div>
          </div>

          {tab === 'details' ? (
            <div className="p-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Dates</div>
                  <div className="mt-1 font-mono text-sm text-slate-900">{item.startDate} → {item.endDate}</div>
                  <div className="mt-1 text-xs text-slate-600">Unit: {String(item.unit || '').toUpperCase()}{item.unit === 'HALF_DAY' ? ` (${item.halfDayPart})` : ''}</div>
                  <div className="mt-1 text-xs text-slate-600">Units: {fmtUnits(item.units)}</div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Reason</div>
                  <div className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{item.reason || '—'}</div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Submitted</div>
                  <div className="mt-1 text-sm text-slate-900">{fmtDt(item.createdAt)}</div>
                  <div className="mt-1 text-xs text-slate-500">Updated: {fmtDt(item.updatedAt)}</div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Approval Timeline</div>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-700">Approved L1</div>
                      <div className="text-xs text-slate-600 font-mono">{item.approvedL1At ? fmtDt(item.approvedL1At) : '—'}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-700">Approved L2</div>
                      <div className="text-xs text-slate-600 font-mono">{item.approvedL2At ? fmtDt(item.approvedL2At) : '—'}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-700">Rejected</div>
                      <div className="text-xs text-slate-600 font-mono">{item.rejectedAt ? fmtDt(item.rejectedAt) : '—'}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-700">Cancelled</div>
                      <div className="text-xs text-slate-600 font-mono">{item.cancelledAt ? fmtDt(item.cancelledAt) : '—'}</div>
                    </div>
                  </div>
                </div>

                {item.rejectionReason ? (
                  <div className="md:col-span-2 rounded-lg border border-rose-200 bg-rose-50 p-4">
                    <div className="text-sm font-semibold text-rose-900">Rejection Reason</div>
                    <div className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">{item.rejectionReason}</div>
                  </div>
                ) : null}

                {item.cancelReason ? (
                  <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">Cancel Reason</div>
                    <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{item.cancelReason}</div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {tab === 'attachments' ? (
            <div className="p-4 pt-0">
              {!attachmentsEnabled ? (
                <div className="rounded-lg border border-slate-200 bg-white p-6">
                  <div className="text-sm font-medium text-slate-900">Attachments are disabled</div>
                  <div className="mt-1 text-sm text-slate-600">LEAVE_ATTACHMENTS_ENABLED must be enabled in system config.</div>
                </div>
              ) : !canReadAttachments ? (
                <ForbiddenState />
              ) : attachments.status === 'loading' && !attachments.data ? (
                <LoadingState />
              ) : attachments.status === 'error' ? (
                <ErrorState error={attachments.error} />
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={attachments.refresh}
                      disabled={attachments.status === 'loading'}
                    >
                      Refresh
                    </button>
                    {canUploadAttachments ? (
                      <button
                        type="button"
                        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400"
                        onClick={() => {
                          setAttFileName('');
                          setAttStorageKey('');
                          setAttMimeType('');
                          setAttSizeBytes('');
                          setAttModalOpen(true);
                        }}
                        disabled={uploadAttachmentMutation.status === 'loading'}
                      >
                        Upload Metadata
                      </button>
                    ) : null}
                  </div>

                  {(attachments.data?.items || []).length === 0 ? (
                    <EmptyState title="No attachments" description="No attachments uploaded for this request." />
                  ) : (
                    <div className="hidden md:block">
                      <Table
                        columns={[
                          { key: 'file', header: 'File', render: (d) => <div className="text-sm font-medium text-slate-900">{d.fileName}</div> },
                          { key: 'mime', header: 'MIME', render: (d) => <div className="text-sm font-mono text-slate-700">{d.mimeType || '—'}</div> },
                          { key: 'size', header: 'Size', render: (d) => <div className="text-sm text-slate-700">{typeof d.sizeBytes === 'number' ? `${d.sizeBytes} bytes` : '—'}</div> },
                          {
                            key: 'action',
                            header: 'Action',
                            render: (d) => (
                              <div className="flex items-center justify-end">
                                <button
                                  type="button"
                                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                                  disabled={downloadMutation.status === 'loading'}
                                  onClick={async () => {
                                    try {
                                      const payload = await downloadMutation.run({ attId: d.id });
                                      const url = payload?.item?.storageKey;
                                      if (url && (String(url).startsWith('http://') || String(url).startsWith('https://'))) {
                                        window.open(url, '_blank', 'noopener,noreferrer');
                                      }
                                    } catch {
                                      // handled by hook
                                    }
                                  }}
                                >
                                  Download
                                </button>
                              </div>
                            )
                          }
                        ]}
                        rows={(attachments.data?.items || []).map((x) => ({ key: x.id, data: x }))}
                      />
                    </div>
                  )}

                  {downloadMutation.status === 'error' ? <ErrorState error={downloadMutation.error} /> : null}
                  {uploadAttachmentMutation.status === 'error' ? <ErrorState error={uploadAttachmentMutation.error} /> : null}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }, [attachments, attachmentsEnabled, approveMutation.status, canApprove, canCancel, canRead, canReadAttachments, canUploadAttachments, cancelMutation.status, downloadMutation, id, isMonthClosed, isMyOwn, item, leaveEnabled, list, navigate, rejectMutation.status, tab, topLoading, uploadAttachmentMutation]);

  const decisionTitle = decisionModal === 'cancel' ? 'Cancel Leave Request' : decisionModal === 'reject' ? 'Reject Leave Request' : decisionModal === 'approve' ? 'Approve Leave Request' : '';
  const decisionHint = decisionModal === 'approve'
    ? 'Reason is optional; it may be required if a month-close override is needed.'
    : 'Reason is required.';

  const isDecisionRequired = decisionModal === 'cancel' || decisionModal === 'reject';

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Leave Request" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mt-4">{content}</div>
      </div>

      {decisionModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (cancelMutation.status === 'loading' || rejectMutation.status === 'loading' || approveMutation.status === 'loading') return;
              setDecisionModal(null);
            }}
          />
          <div className="relative w-full max-w-xl rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">{decisionTitle}</div>
            <div className="mt-1 text-sm text-slate-600">{decisionHint}</div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">Reason</label>
              <textarea
                className="mt-1 w-full rounded-md border-slate-300 text-sm"
                rows={4}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder={decisionModal === 'approve' ? 'Optional' : 'Required'}
              />
            </div>

            {(cancelMutation.status === 'error' || rejectMutation.status === 'error' || approveMutation.status === 'error') ? (
              <div className="mt-3">
                <ErrorState error={cancelMutation.error || rejectMutation.error || approveMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={cancelMutation.status === 'loading' || rejectMutation.status === 'loading' || approveMutation.status === 'loading'}
                onClick={() => setDecisionModal(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={
                  cancelMutation.status === 'loading' ||
                  rejectMutation.status === 'loading' ||
                  approveMutation.status === 'loading' ||
                  (isDecisionRequired && decisionReason.trim().length === 0)
                }
                onClick={async () => {
                  const trimmed = decisionReason.trim();
                  try {
                    if (decisionModal === 'cancel') {
                      await cancelMutation.run({ reason: trimmed });
                    } else if (decisionModal === 'reject') {
                      await rejectMutation.run({ reason: trimmed });
                    } else if (decisionModal === 'approve') {
                      await approveMutation.run({ reason: trimmed || null });
                    }
                    setDecisionModal(null);
                    navigate(-1);
                  } catch {
                    // handled by hook
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {attModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (uploadAttachmentMutation.status === 'loading') return;
              setAttModalOpen(false);
            }}
          />
          <div className="relative w-full max-w-2xl rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">Upload Attachment (Metadata)</div>
            <div className="mt-1 text-sm text-slate-600">Provide a signed URL as storageKey.</div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">File Name</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={attFileName} onChange={(e) => setAttFileName(e.target.value)} placeholder="document.pdf" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">MIME Type</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono" value={attMimeType} onChange={(e) => setAttMimeType(e.target.value)} placeholder="application/pdf" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Storage Key (signed URL)</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono" value={attStorageKey} onChange={(e) => setAttStorageKey(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Size Bytes</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono" value={attSizeBytes} onChange={(e) => setAttSizeBytes(e.target.value)} placeholder="12345" />
              </div>
            </div>

            {uploadAttachmentMutation.status === 'error' ? (
              <div className="mt-3">
                <ErrorState error={uploadAttachmentMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={uploadAttachmentMutation.status === 'loading'}
                onClick={() => setAttModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={
                  uploadAttachmentMutation.status === 'loading' ||
                  attFileName.trim().length === 0 ||
                  attStorageKey.trim().length === 0 ||
                  attMimeType.trim().length === 0 ||
                  attSizeBytes.trim().length === 0
                }
                onClick={async () => {
                  try {
                    await uploadAttachmentMutation.run({
                      payload: {
                        fileName: attFileName.trim(),
                        storageKey: attStorageKey.trim(),
                        mimeType: attMimeType.trim(),
                        sizeBytes: Number(attSizeBytes)
                      }
                    });
                    setAttModalOpen(false);
                    attachments.refresh();
                  } catch {
                    // handled by hook
                  }
                }}
              >
                {uploadAttachmentMutation.status === 'loading' ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
