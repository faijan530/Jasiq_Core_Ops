export async function queryCashflow(pool, { from, to, divisionId, includePayroll }) {
  const whereIncome = [`ip.paid_at BETWEEN $1::timestamp AND $2::timestamp`];
  const incomeParams = [`${from}T00:00:00.000Z`, `${to}T23:59:59.999Z`];
  let idx = 3;

  if (divisionId) {
    whereIncome.push(`i.division_id = $${idx++}::uuid`);
    incomeParams.push(divisionId);
  }

  const incomeSql = `
    SELECT
      date_trunc('day', ip.paid_at)::date AS day,
      COALESCE(SUM(ip.paid_amount), 0) AS inflow
    FROM income_payment ip
    JOIN income i ON i.id = ip.income_id
    WHERE ${whereIncome.join(' AND ')}
    GROUP BY date_trunc('day', ip.paid_at)::date
  `;

  const whereExpense = [`ep.paid_at BETWEEN $1::timestamp AND $2::timestamp`];
  const expenseParams = [`${from}T00:00:00.000Z`, `${to}T23:59:59.999Z`];
  let eidx = 3;

  if (divisionId) {
    whereExpense.push(`e.division_id = $${eidx++}::uuid`);
    expenseParams.push(divisionId);
  }

  const expenseSql = `
    SELECT
      date_trunc('day', ep.paid_at)::date AS day,
      COALESCE(SUM(ep.paid_amount), 0) AS outflow
    FROM expense_payment ep
    JOIN expense e ON e.id = ep.expense_id
    WHERE ${whereExpense.join(' AND ')}
    GROUP BY date_trunc('day', ep.paid_at)::date
  `;

  const payrollSql = `
    SELECT
      date_trunc('day', pp.paid_at)::date AS day,
      COALESCE(SUM(pp.paid_amount), 0) AS outflow
    FROM payroll_payment pp
    WHERE pp.paid_at BETWEEN $1::timestamp AND $2::timestamp
    GROUP BY date_trunc('day', pp.paid_at)::date
  `;

  const [incRes, expRes] = await Promise.all([
    pool.query(incomeSql, incomeParams),
    pool.query(expenseSql, expenseParams)
  ]);

  const payRes = includePayroll ? await pool.query(payrollSql, [`${from}T00:00:00.000Z`, `${to}T23:59:59.999Z`]) : { rows: [] };

  const map = new Map();
  for (const r of incRes.rows || []) {
    map.set(String(r.day), { day: r.day, inflow: Number(r.inflow || 0), outflow: 0 });
  }
  for (const r of expRes.rows || []) {
    const k = String(r.day);
    const cur = map.get(k) || { day: r.day, inflow: 0, outflow: 0 };
    cur.outflow += Number(r.outflow || 0);
    map.set(k, cur);
  }
  for (const r of payRes.rows || []) {
    const k = String(r.day);
    const cur = map.get(k) || { day: r.day, inflow: 0, outflow: 0 };
    cur.outflow += Number(r.outflow || 0);
    map.set(k, cur);
  }

  const items = Array.from(map.values()).sort((a, b) => String(a.day).localeCompare(String(b.day)));
  return items.map((it) => ({
    day: it.day,
    inflow: it.inflow,
    outflow: it.outflow,
    net: Number(it.inflow) - Number(it.outflow)
  }));
}
