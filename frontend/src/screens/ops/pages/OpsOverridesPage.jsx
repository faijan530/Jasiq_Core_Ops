import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { opsService } from '../../../services/opsService.js';
import { Button, ModalFrame, OpsPageShell, StatusBadge, TableShell } from '../_opsUi.jsx';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function Tab({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
        active ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      )}
    >
      {children}
    </button>
  );
}

export function OpsOverridesPage({ title = 'Overrides' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const [tab, setTab] = useState('REQUESTED');

  const [createOpen, setCreateOpen] = useState(false);
  const [overrideType, setOverrideType] = useState('MONTH_CLOSE');
  const [targetEntityType, setTargetEntityType] = useState('MONTH_CLOSE');
  const [targetEntityId, setTargetEntityId] = useState('');
  const [requestedAction, setRequestedAction] = useState('CLOSE');
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);

  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionMode, setDecisionMode] = useState('APPROVE');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionRow, setDecisionRow] = useState(null);
  const [deciding, setDeciding] = useState(false);

  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await opsService.overrides.list({ status: tab });
      setRows(res?.items || []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(
    () => [
      { key: 'type', label: 'Override Type' },
      { key: 'target', label: 'Target' },
      { key: 'status', label: 'Status' },
      { key: 'requested', label: 'Requested By' },
      { key: 'actions', label: 'Actions', align: 'right' }
    ],
    []
  );

  async function onCreate() {
    const r = String(reason || '').trim();
    if (!r) return;

    try {
      setCreating(true);
      await opsService.overrides.create({
        overrideType,
        divisionId: null,
        targetEntityType,
        targetEntityId,
        requestedAction,
        reason: r
      });
      setCreateOpen(false);
      setTargetEntityId('');
      setReason('');
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setCreating(false);
    }
  }

  function openDecision(row, mode) {
    setDecisionRow(row);
    setDecisionMode(mode);
    setDecisionReason('');
    setDecisionOpen(true);
  }

  async function submitDecision() {
    const r = String(decisionReason || '').trim();
    if (!decisionRow) return;
    if (!r) return;

    try {
      setDeciding(true);
      if (decisionMode === 'APPROVE') {
        await opsService.overrides.approve(decisionRow.id, { approvalReason: r });
      } else {
        await opsService.overrides.reject(decisionRow.id, { approvalReason: r });
      }
      setDecisionOpen(false);
      setDecisionRow(null);
      setDecisionReason('');
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setDeciding(false);
    }
  }

  async function execute(row) {
    try {
      setActingId(row.id);
      await opsService.overrides.execute(row.id, { reason: '' });
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setActingId(null);
    }
  }

  return (
    <>
      <OpsPageShell
        title={title}
        subtitle="Governance overrides require explicit approval"
        loading={loading}
        error={error}
        empty={
          !loading && !error && (rows || []).length === 0
            ? { title: 'No overrides', description: 'No override requests found for this status.' }
            : null
        }
        onRetry={load}
      >
        <div className="rounded-xl border border-amber-200 bg-amber-50 shadow-sm p-4 text-sm text-amber-800">
          Overrides allow exceptional actions that may bypass standard policies. Use with caution.
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Tab active={tab === 'REQUESTED'} onClick={() => setTab('REQUESTED')}>Requested</Tab>
            <Tab active={tab === 'APPROVED'} onClick={() => setTab('APPROVED')}>Approved</Tab>
            <Tab active={tab === 'EXECUTED'} onClick={() => setTab('EXECUTED')}>Executed</Tab>
          </div>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>Create Override</Button>
        </div>

        <TableShell columns={columns}>
          {(rows || []).map((r) => {
            const status = String(r.status || '').toUpperCase();
            return (
              <tr key={r.id}>
                <td className="px-4 py-3 text-sm text-slate-900 font-medium">{r.override_type || r.overrideType}</td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {r.target_entity_type || r.targetEntityType}:{' '}
                  {String(r.target_entity_id || r.targetEntityId || '').slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-sm"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-sm text-slate-700">{String(r.requested_by || r.requestedBy || '').slice(0, 8) || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {status === 'REQUESTED' ? (
                      <>
                        <Button disabled={actingId === r.id} onClick={() => openDecision(r, 'APPROVE')}>Approve</Button>
                        <Button variant="danger" disabled={actingId === r.id} onClick={() => openDecision(r, 'REJECT')}>Reject</Button>
                      </>
                    ) : null}
                    {status === 'APPROVED' ? (
                      <Button variant="primary" disabled={actingId === r.id} onClick={() => execute(r)}>
                        Execute
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </TableShell>
      </OpsPageShell>

      <ModalFrame open={createOpen} title="Create override" onClose={() => setCreateOpen(false)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Override type</label>
              <select
                value={overrideType}
                onChange={(e) => setOverrideType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MONTH_CLOSE">MONTH_CLOSE</option>
                <option value="EXPENSE">EXPENSE</option>
                <option value="INCOME">INCOME</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Requested action</label>
              <select
                value={requestedAction}
                onChange={(e) => setRequestedAction(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CLOSE">CLOSE</option>
                <option value="OPEN">OPEN</option>
                <option value="APPROVE">APPROVE</option>
                <option value="REJECT">REJECT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target entity type</label>
            <input
              value={targetEntityType}
              onChange={(e) => setTargetEntityType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. MONTH_CLOSE"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target entity ID</label>
            <input
              value={targetEntityId}
              onChange={(e) => setTargetEntityId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="UUID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason (required)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Required"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button disabled={creating} onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={creating || !String(reason || '').trim()} onClick={onCreate}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </div>
      </ModalFrame>

      <ModalFrame
        open={decisionOpen}
        title={decisionMode === 'APPROVE' ? 'Approve override' : 'Reject override'}
        onClose={() => setDecisionOpen(false)}
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-700">Reason is required.</div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            <textarea
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Required"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button disabled={deciding} onClick={() => setDecisionOpen(false)}>Cancel</Button>
            <Button
              variant={decisionMode === 'APPROVE' ? 'primary' : 'danger'}
              disabled={deciding || !String(decisionReason || '').trim()}
              onClick={submitDecision}
            >
              {deciding ? 'Submitting…' : decisionMode === 'APPROVE' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </div>
      </ModalFrame>
    </>
  );
}
