import { readOpsConfig, assertOpsInboxEnabled } from './opsPolicy.service.js';

function monthStartUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function getOpsDashboardSummary(pool) {
  const cfg = await readOpsConfig(pool);
  assertOpsInboxEnabled(cfg);

  const now = new Date();
  const m = monthStartUtc(now).toISOString().slice(0, 10);

  const [leaveRes, tsRes, expRes, incRes, ovRes] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS c FROM leave_request WHERE status = 'SUBMITTED'"),
    pool.query("SELECT COUNT(*)::int AS c FROM timesheet_header WHERE status = 'SUBMITTED'"),
    pool.query("SELECT COUNT(*)::int AS c FROM expense WHERE status = 'SUBMITTED'"),
    pool.query("SELECT COUNT(*)::int AS c FROM income WHERE status = 'SUBMITTED'"),
    pool.query("SELECT COUNT(*)::int AS c FROM override_request WHERE status = 'REQUESTED'")
  ]);

  const approvalsPending =
    Number(leaveRes.rows[0]?.c || 0) +
    Number(tsRes.rows[0]?.c || 0) +
    Number(expRes.rows[0]?.c || 0) +
    Number(incRes.rows[0]?.c || 0) +
    Number(ovRes.rows[0]?.c || 0);

  const receivablesRes = await pool.query(
    "SELECT COALESCE(SUM(amount),0)::numeric AS due FROM income WHERE status IN ('SUBMITTED','APPROVED','PARTIALLY_PAID')"
  );

  const payablesRes = await pool.query(
    "SELECT COALESCE(SUM(amount),0)::numeric AS due FROM expense WHERE status IN ('SUBMITTED','APPROVED')"
  );

  const payrollRes = await pool.query(
    'SELECT status FROM payroll_run ORDER BY month DESC LIMIT 1'
  );

  const monthCloseRes = await pool.query(
    'SELECT status FROM month_close WHERE month = $1 AND scope = $2',
    [m, 'COMPANY']
  );

  const dqRes = await pool.query(
    "SELECT COUNT(*)::int AS c FROM data_quality_finding WHERE severity = 'CRITICAL' AND status IN ('OPEN','ACKNOWLEDGED')"
  );

  return {
    approvalsPending,
    receivablesDue: String(receivablesRes.rows[0]?.due || '0'),
    payablesDue: String(payablesRes.rows[0]?.due || '0'),
    payrollStatus: payrollRes.rows[0]?.status || null,
    monthCloseStatus: monthCloseRes.rows[0]?.status || 'OPEN',
    criticalDataIssues: Number(dqRes.rows[0]?.c || 0)
  };
}
