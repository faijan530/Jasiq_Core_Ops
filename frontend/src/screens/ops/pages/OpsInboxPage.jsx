import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { opsService } from '../../../services/opsService.js';
import { Button, ModalFrame, OpsPageShell, StatusBadge, TableShell, useSlaHelpers } from '../_opsUi.jsx';

function formatDateTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

export function OpsInboxPage({ title = 'Inbox' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [pendingReject, setPendingReject] = useState(null);

  const [actingId, setActingId] = useState(null);

  const { isOverdue } = useSlaHelpers(rows);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await opsService.inbox.list();
      setRows(res?.items || []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function doAction(row, action, reason) {
    try {
      setActingId(row.entityId);
      await opsService.inbox.action({
        itemType: row.itemType,
        entityId: row.entityId,
        action,
        reason
      });
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setActingId(null);
    }
  }

  function openReject(row) {
    setPendingReject(row);
    setRejectReason('');
    setRejectOpen(true);
  }

  async function submitReject() {
    const r = String(rejectReason || '').trim();
    if (!pendingReject) return;
    if (!r) return;

    try {
      setRejecting(true);
      await doAction(pendingReject, 'REJECT', r);
      setRejectOpen(false);
      setPendingReject(null);
      setRejectReason('');
    } finally {
      setRejecting(false);
    }
  }

  const columns = useMemo(
    () => [
      { key: 'type', label: 'Type' },
      { key: 'title', label: 'Title' },
      { key: 'division', label: 'Division' },
      { key: 'sla', label: 'SLA Due' },
      { key: 'status', label: 'Status' },
      { key: 'actions', label: 'Actions', align: 'right' }
    ],
    []
  );

  return (
    <>
      <OpsPageShell
        title={title}
        subtitle="Actionable items across modules"
        loading={loading}
        error={error}
        empty={
          !loading && !error && (rows || []).length === 0
            ? { title: 'No items', description: 'There are no actionable items in the inbox.' }
            : null
        }
        onRetry={load}
      >
        <TableShell columns={columns}>
          {(rows || []).map((r) => {
            const overdue = isOverdue(r.slaDueAt, r.status);
            const canApprove = (r.actions || []).includes('APPROVE');
            const canReject = (r.actions || []).includes('REJECT');

            return (
              <tr key={`${r.itemType}-${r.entityId}`} className={overdue ? 'bg-rose-50' : ''}>
                <td className="px-4 py-3 text-sm text-slate-700 font-medium">{r.itemType}</td>
                <td className="px-4 py-3 text-sm text-slate-900">{r.title}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{r.divisionId ? String(r.divisionId).slice(0, 8) : '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{formatDateTime(r.slaDueAt)}</td>
                <td className="px-4 py-3 text-sm"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {canApprove ? (
                      <Button
                        variant="primary"
                        disabled={actingId === r.entityId}
                        onClick={() => doAction(r, 'APPROVE', '')}
                      >
                        Approve
                      </Button>
                    ) : null}
                    {canReject ? (
                      <Button
                        variant="danger"
                        disabled={actingId === r.entityId}
                        onClick={() => openReject(r)}
                      >
                        Reject
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </TableShell>
      </OpsPageShell>

      <ModalFrame open={rejectOpen} title="Reject item" onClose={() => setRejectOpen(false)}>
        <div className="space-y-4">
          <div className="text-sm text-slate-700">Reason is required to reject.</div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Required"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button disabled={rejecting} onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={rejecting || !String(rejectReason || '').trim()}
              onClick={submitReject}
            >
              {rejecting ? 'Submitting…' : 'Reject'}
            </Button>
          </div>
        </div>
      </ModalFrame>
    </>
  );
}
