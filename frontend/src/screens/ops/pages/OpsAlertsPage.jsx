import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { opsService } from '../../../services/opsService.js';
import { Badge, Button, Drawer, OpsPageShell, SeverityBadge, StatusBadge, TableShell } from '../_opsUi.jsx';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function OpsAlertsPage({ title = 'Alerts' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await opsService.alerts.list({ status: status || undefined });
      let items = res?.items || [];
      if (severity) {
        items = items.filter((a) => String(a.severity || '').toUpperCase() === String(severity).toUpperCase());
      }
      setRows(items);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [severity, status]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(
    () => [
      { key: 'severity', label: 'Severity' },
      { key: 'title', label: 'Title' },
      { key: 'division', label: 'Division' },
      { key: 'status', label: 'Status' },
      { key: 'actions', label: 'Actions', align: 'right' }
    ],
    []
  );

  async function acknowledge(row) {
    try {
      setActingId(row.id);
      await opsService.alerts.acknowledge(row.id);
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setActingId(null);
    }
  }

  async function resolve(row) {
    try {
      setActingId(row.id);
      await opsService.alerts.resolve(row.id);
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setActingId(null);
    }
  }

  function openDrawer(row) {
    setSelected(row);
    setDrawerOpen(true);
  }

  return (
    <>
      <OpsPageShell
        title={title}
        subtitle="Operational alerts requiring attention"
        loading={loading}
        error={error}
        empty={
          !loading && !error && (rows || []).length === 0
            ? { title: 'No alerts', description: 'There are no alerts to show.' }
            : null
        }
        onRetry={load}
      >
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="OPEN">OPEN</option>
                <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <div className="flex items-end justify-end">
              <Button onClick={load} disabled={loading}>Refresh</Button>
            </div>
          </div>
        </div>

        <TableShell columns={columns}>
          {(rows || []).map((r) => (
            <tr
              key={r.id}
              className="hover:bg-slate-50 cursor-pointer"
              onClick={() => openDrawer(r)}
            >
              <td className="px-4 py-3 text-sm"><SeverityBadge severity={r.severity} /></td>
              <td className="px-4 py-3 text-sm text-slate-900 font-medium">{r.title}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{r.division_id ? String(r.division_id).slice(0, 8) : '—'}</td>
              <td className="px-4 py-3 text-sm"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    disabled={actingId === r.id || String(r.status).toUpperCase() !== 'OPEN'}
                    onClick={() => acknowledge(r)}
                  >
                    Acknowledge
                  </Button>
                  <Button
                    variant="primary"
                    disabled={actingId === r.id || String(r.status).toUpperCase() === 'RESOLVED'}
                    onClick={() => resolve(r)}
                  >
                    Resolve
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </TableShell>
      </OpsPageShell>

      <Drawer open={drawerOpen} title="Alert details" onClose={() => setDrawerOpen(false)}>
        {!selected ? null : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Severity</div>
              <SeverityBadge severity={selected.severity} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Title</div>
              <div className="text-sm text-slate-900 mt-1 font-medium">{selected.title}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Message</div>
              <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{selected.message || '—'}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{selected.alert_type || selected.alertType || '—'}</Badge>
              <StatusBadge status={selected.status} />
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
