export async function getPayrollReportsSummaryService(pool) {
  const res = await pool.query(
    `
    SELECT
      pr.month AS month,
      COUNT(DISTINCT pi.employee_id) AS total_employees,
      COALESCE(SUM(CASE WHEN pi.is_system_generated = true AND pi.item_type <> 'DEDUCTION' THEN pi.amount ELSE 0 END), 0) AS total_gross,
      COALESCE(SUM(CASE WHEN pi.is_system_generated = true AND pi.item_type = 'DEDUCTION' THEN pi.amount ELSE 0 END), 0) AS total_deductions,
      COALESCE(SUM(CASE WHEN pi.is_system_generated = true AND pi.item_type <> 'DEDUCTION' THEN pi.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN pi.is_system_generated = true AND pi.item_type = 'DEDUCTION' THEN pi.amount ELSE 0 END), 0)
        AS total_net
    FROM payroll_run pr
    LEFT JOIN payroll_item pi ON pi.payroll_run_id = pr.id
    WHERE pr.status IN ('LOCKED','PAID','CLOSED')
    GROUP BY pr.month
    ORDER BY pr.month DESC
    `
  );

  return res.rows;
}

function toMoney(n) {
  if (n === null || n === undefined) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

export async function getPayrollReportsMonthSummaryService(pool, { month }) {
  const totalsRes = await pool.query(
    `
    WITH run AS (
      SELECT id, month, status
      FROM payroll_run
      WHERE to_char(month::date, 'YYYY-MM') = $1
      ORDER BY month DESC
      LIMIT 1
    )
    SELECT
      (SELECT month FROM run) AS month,
      COALESCE(SUM(CASE WHEN pi.is_system_generated = true AND pi.item_type <> 'DEDUCTION' THEN pi.amount ELSE 0 END), 0) AS total_gross,
      COALESCE(SUM(CASE WHEN pi.is_system_generated = false THEN (CASE WHEN pi.item_type = 'DEDUCTION' THEN -pi.amount ELSE pi.amount END) ELSE 0 END), 0) AS total_adjustments,
      COUNT(DISTINCT pi.employee_id) AS total_employees
    FROM run
    LEFT JOIN payroll_item pi ON pi.payroll_run_id = run.id
    `,
    [month]
  );

  const m = totalsRes.rows[0]?.month || `${month}-01`;
  const totalGross = toMoney(totalsRes.rows[0]?.total_gross);
  const totalAdjustments = toMoney(totalsRes.rows[0]?.total_adjustments);

  const netRes = await pool.query(
    `
    WITH run AS (
      SELECT id
      FROM payroll_run
      WHERE to_char(month::date, 'YYYY-MM') = $1
      ORDER BY month DESC
      LIMIT 1
    )
    SELECT
      COALESCE(SUM(CASE WHEN pi.is_system_generated = true AND pi.item_type <> 'DEDUCTION' THEN pi.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN pi.is_system_generated = true AND pi.item_type = 'DEDUCTION' THEN pi.amount ELSE 0 END), 0)
        + COALESCE(SUM(CASE WHEN pi.is_system_generated = false THEN (CASE WHEN pi.item_type = 'DEDUCTION' THEN -pi.amount ELSE pi.amount END) ELSE 0 END), 0)
        AS total_net
    FROM run
    LEFT JOIN payroll_item pi ON pi.payroll_run_id = run.id
    `,
    [month]
  );

  const totalNet = toMoney(netRes.rows[0]?.total_net);
  const totalEmployees = Number(totalsRes.rows[0]?.total_employees || 0);

  const paidRes = await pool.query(
    `
    WITH run AS (
      SELECT id
      FROM payroll_run
      WHERE to_char(month::date, 'YYYY-MM') = $1
      ORDER BY month DESC
      LIMIT 1
    )
    SELECT COUNT(DISTINCT pp.employee_id)::int AS paid_count
    FROM run
    LEFT JOIN payroll_payment pp ON pp.payroll_run_id = run.id
    `,
    [month]
  );

  const paidCount = Number(paidRes.rows[0]?.paid_count || 0);
  const unpaidCount = Math.max(0, totalEmployees - paidCount);

  const divisionRes = await pool.query(
    `
    WITH run AS (
      SELECT id
      FROM payroll_run
      WHERE to_char(month::date, 'YYYY-MM') = $1
      ORDER BY month DESC
      LIMIT 1
    )
    SELECT
      COALESCE(d.name, 'Company Overhead') AS "divisionName",
      COALESCE(SUM(
        CASE
          WHEN pi.is_system_generated = true AND pi.item_type <> 'DEDUCTION' THEN pi.amount
          WHEN pi.is_system_generated = true AND pi.item_type = 'DEDUCTION' THEN -pi.amount
          WHEN pi.is_system_generated = false AND pi.item_type = 'DEDUCTION' THEN -pi.amount
          WHEN pi.is_system_generated = false THEN pi.amount
          ELSE 0
        END
      ), 0) AS "totalNet"
    FROM run
    LEFT JOIN payroll_item pi ON pi.payroll_run_id = run.id
    LEFT JOIN division d ON d.id = pi.division_id
    GROUP BY COALESCE(d.name, 'Company Overhead')
    ORDER BY "totalNet" DESC
    `,
    [month]
  );

  return {
    month: m,
    totalGross,
    totalAdjustments,
    totalNet,
    totalEmployees,
    paidCount,
    unpaidCount,
    divisionBreakdown: divisionRes.rows || []
  };
}
