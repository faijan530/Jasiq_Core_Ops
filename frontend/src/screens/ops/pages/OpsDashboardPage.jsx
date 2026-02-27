import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { opsService } from '../../../services/opsService.js';
import { KpiCard, OpsPageShell, useSlaHelpers } from '../_opsUi.jsx';

function countByStatus(items, match) {
  const m = String(match || '').toUpperCase();
  return (items || []).filter((x) => String(x?.status || '').toUpperCase() === m).length;
}

export function OpsDashboardPage({ title = 'Operations Dashboard' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [inbox, setInbox] = useState([]);
  const [summary, setSummary] = useState(null);

  const { overdueCount } = useSlaHelpers(inbox);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      opsService.inbox.list(),
      opsService.dashboard.summary()
    ]);

    const nextErr = results.find((r) => r.status === 'rejected')?.reason || null;

    if (results[0].status === 'fulfilled') setInbox(results[0].value?.items || []);
    if (results[1].status === 'fulfilled') setSummary(results[1].value?.item || null);

    setError(nextErr);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingApprovals = useMemo(() => Number(summary?.approvalsPending ?? inbox?.length ?? 0), [summary, inbox]);
  const criticalDataIssues = useMemo(() => Number(summary?.criticalDataIssues ?? 0), [summary]);

  const receivablesDue = summary?.receivablesDue ?? '—';
  const payablesDue = summary?.payablesDue ?? '—';
  const payrollStatus = summary?.payrollStatus ?? '—';

  return (
    <OpsPageShell title={title} subtitle="Cross-functional operational health" loading={loading} error={error} onRetry={load}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Pending Approvals" value={pendingApprovals} />
        <KpiCard label="SLA Overdue" value={overdueCount} />
        <KpiCard label="Receivables Due" value={receivablesDue} hint="From Finance modules" />
        <KpiCard label="Payables Due" value={payablesDue} hint="From Finance modules" />
        <KpiCard label="Payroll Status" value={payrollStatus} hint="Latest payroll run" />
        <KpiCard label="Critical Data Issues" value={criticalDataIssues} />
      </div>
    </OpsPageShell>
  );
}
