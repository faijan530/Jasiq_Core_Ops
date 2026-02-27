function toMoney(n) {
  if (n === null || n === undefined) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

export async function getFinanceDashboardService(pool) {
  const activeRes = await pool.query(
    `
    SELECT id, month
    FROM payroll_run
    WHERE status IN ('DRAFT','REVIEWED','LOCKED','PAID')
    ORDER BY month DESC
    LIMIT 1
    `
  );

  const active = activeRes.rows[0] || null;
  const activeMonth = active?.month || null;

  const totalsRes = await pool.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN pi.is_system_generated = true AND pi.item_type <> 'DEDUCTION' THEN pi.amount ELSE 0 END), 0) AS total_gross,
      COALESCE(SUM(CASE WHEN pi.is_system_generated = true AND pi.item_type = 'DEDUCTION' THEN pi.amount ELSE 0 END), 0) AS total_deductions,
      COUNT(DISTINCT pi.employee_id) AS total_employees
    FROM payroll_run pr
    LEFT JOIN payroll_item pi ON pi.payroll_run_id = pr.id
    WHERE ($1::date IS NOT NULL AND pr.month = $1::date)
    `,
    [activeMonth]
  );

  const totalGross = toMoney(totalsRes.rows[0]?.total_gross);
  const totalDeductions = toMoney(totalsRes.rows[0]?.total_deductions);
  const totalNet = totalGross - totalDeductions;
  const totalEmployees = Number(totalsRes.rows[0]?.total_employees || 0);

  const paidThisMonthRes = await pool.query(
    `
    SELECT COALESCE(SUM(pp.paid_amount), 0) AS total_paid
    FROM payroll_run pr
    JOIN payroll_payment pp ON pp.payroll_run_id = pr.id
    WHERE ($1::date IS NOT NULL AND pr.month = $1::date)
    `,
    [activeMonth]
  );

  const totalPaidThisMonth = toMoney(paidThisMonthRes.rows[0]?.total_paid);

  const pendingRunsRes = await pool.query(
    `
    SELECT COUNT(1)::int AS c
    FROM payroll_run
    WHERE status IN ('DRAFT','REVIEWED','LOCKED')
    `
  );

  const pendingPayrolls = Number(pendingRunsRes.rows[0]?.c || 0);

  const lastMonthRes = await pool.query(
    `
    WITH last_month AS (
      SELECT date_trunc('month', MAX(month)::date) - INTERVAL '1 month' AS m
      FROM payroll_run
    )
    SELECT
      COALESCE(SUM(CASE WHEN pi.is_system_generated = true AND pi.item_type <> 'DEDUCTION' THEN pi.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN pi.is_system_generated = true AND pi.item_type = 'DEDUCTION' THEN pi.amount ELSE 0 END), 0)
        AS last_month_expense
    FROM payroll_run pr
    JOIN last_month lm ON date_trunc('month', pr.month::date) = lm.m
    LEFT JOIN payroll_item pi ON pi.payroll_run_id = pr.id
    `
  );

  const lastMonthExpense = toMoney(lastMonthRes.rows[0]?.last_month_expense);

  const trendRes = await pool.query(
    `
    WITH months AS (
      SELECT generate_series(
        date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
        date_trunc('month', CURRENT_DATE),
        INTERVAL '1 month'
      ) AS m
    ), monthly AS (
      SELECT
        date_trunc('month', pr.month::date) AS m,
        COALESCE(SUM(CASE WHEN pi.is_system_generated = true AND pi.item_type <> 'DEDUCTION' THEN pi.amount ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN pi.is_system_generated = true AND pi.item_type = 'DEDUCTION' THEN pi.amount ELSE 0 END), 0)
          AS total_net
      FROM payroll_run pr
      LEFT JOIN payroll_item pi ON pi.payroll_run_id = pr.id
      WHERE pr.status IN ('LOCKED','PAID','CLOSED')
      GROUP BY date_trunc('month', pr.month::date)
    )
    SELECT
      to_char(m.m, 'YYYY-MM') AS month,
      COALESCE(monthly.total_net, 0) AS totalNet
    FROM months m
    LEFT JOIN monthly ON monthly.m = m.m
    ORDER BY m.m ASC
    `
  );

  const monthlyExpenseTrend = (trendRes.rows || []).map((r) => ({
    month: r.month,
    totalNet: toMoney(r.totalnet ?? r.totalNet)
  }));

  return {
    activePayrollMonth: activeMonth,
    totalGross,
    totalNet,
    totalEmployees,
    totalPaidThisMonth,
    pendingPayrolls,
    lastMonthExpense,
    monthlyExpenseTrend
  };
}
