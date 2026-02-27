import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { opsService } from '../../../services/opsService.js';
import { Button, OpsPageShell, SeverityBadge, StatusBadge, TableShell } from '../_opsUi.jsx';

function severityRank(s) {
  const v = String(s || '').toUpperCase();
  if (v === 'CRITICAL') return 0;
  if (v === 'HIGH') return 1;
  if (v === 'MEDIUM') return 2;
  return 3;
}

export function OpsDataQualityPage({ title = 'Data Quality' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const [running, setRunning] = useState(false);
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await opsService.dataQuality.listFindings({ page: 1, pageSize: 200 });
      const items = res?.items || [];
      items.sort((a, b) => {
        const ra = severityRank(a.severity);
        const rb = severityRank(b.severity);
        if (ra !== rb) return ra - rb;
        const ta = new Date(a.created_at || a.createdAt || 0).getTime();
        const tb = new Date(b.created_at || b.createdAt || 0).getTime();
        return tb - ta;
      });
      setRows(items);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runChecks() {
    try {
      setRunning(true);
      await opsService.dataQuality.run();
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setRunning(false);
    }
  }

  async function acknowledge(row) {
    try {
      setActingId(row.id);
      await opsService.dataQuality.acknowledge(row.id);
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
      await opsService.dataQuality.resolve(row.id);
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setActingId(null);
    }
  }

  const columns = useMemo(
    () => [
      { key: 'severity', label: 'Severity' },
      { key: 'type', label: 'Finding Type' },
      { key: 'division', label: 'Division' },
      { key: 'entity', label: 'Entity' },
      { key: 'status', label: 'Status' },
      { key: 'actions', label: 'Actions', align: 'right' }
    ],
    []
  );

  return (
    <OpsPageShell
      title={title}
      subtitle="Automated integrity checks and findings"
      loading={loading}
      error={error}
      empty={
        !loading && !error && (rows || []).length === 0
          ? { title: 'No findings', description: 'No data quality findings were found.' }
          : null
      }
      onRetry={load}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-slate-600">Critical findings are pinned to the top.</div>
        <Button variant="primary" disabled={running} onClick={runChecks}>
          {running ? 'Running…' : 'Run checks'}
        </Button>
      </div>

      <TableShell columns={columns}>
        {(rows || []).map((r) => {
          const status = String(r.status || '').toUpperCase();
          return (
            <tr key={r.id} className={String(r.severity || '').toUpperCase() === 'CRITICAL' ? 'bg-rose-50' : ''}>
              <td className="px-4 py-3 text-sm"><SeverityBadge severity={r.severity} /></td>
              <td className="px-4 py-3 text-sm text-slate-900 font-medium">{r.finding_type || r.findingType}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{r.division_id ? String(r.division_id).slice(0, 8) : '—'}</td>
              <td className="px-4 py-3 text-sm text-slate-700">
                {r.entity_type || r.entityType}{r.entity_id ? `:${String(r.entity_id).slice(0, 8)}` : ''}
              </td>
              <td className="px-4 py-3 text-sm"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    disabled={actingId === r.id || status !== 'OPEN'}
                    onClick={() => acknowledge(r)}
                  >
                    Acknowledge
                  </Button>
                  <Button
                    variant="primary"
                    disabled={actingId === r.id || status === 'RESOLVED'}
                    onClick={() => resolve(r)}
                  >
                    Resolve
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
      </TableShell>
    </OpsPageShell>
  );
}
