function parseMonthFilter(month) {
  const m = String(month || '').trim();
  if (!m) return null;
  if (!/^\d{4}-\d{2}$/.test(m)) return null;
  return m;
}

function parseTypeFilter(type) {
  const t = String(type || '').trim().toUpperCase();
  if (!t) return null;
  if (!['PAYROLL', 'ADJUSTMENT', 'BONUS', 'PAYMENT'].includes(t)) return null;
  return t;
}

export async function listPayrollLedgerEntriesService(pool, { offset, limit, query }) {
  const month = parseMonthFilter(query?.month);
  const type = parseTypeFilter(query?.type);
  const search = query?.search ? String(query.search).trim() : null;

  const where = [];
  const params = [];

  if (month) {
    params.push(month);
    where.push(`to_char(e.date::date, 'YYYY-MM') = $${params.length}`);
  }

  if (type) {
    params.push(type);
    where.push(`e.type = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    where.push(`COALESCE(e.employee_name,'') ILIKE $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const baseSql = `
    WITH entries AS (
      SELECT
        pi.id AS id,
        COALESCE(pi.created_at, pr.generated_at) AS date,
        CASE
          WHEN pi.item_type = 'BONUS' THEN 'BONUS'
          WHEN pi.is_system_generated = false THEN 'ADJUSTMENT'
          ELSE 'PAYROLL'
        END AS type,
        CONCAT('PAYRUN ', to_char(pr.month, 'YYYY-MM')) AS reference,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        COALESCE(d.name, 'Company Overhead') AS division_name,
        CASE WHEN pi.item_type = 'DEDUCTION' THEN pi.amount ELSE 0 END AS debit,
        CASE WHEN pi.item_type <> 'DEDUCTION' THEN pi.amount ELSE 0 END AS credit,
        pi.created_at AS sort_ts
      FROM payroll_item pi
      JOIN payroll_run pr ON pr.id = pi.payroll_run_id
      JOIN employee e ON e.id = pi.employee_id
      LEFT JOIN division d ON d.id = pi.division_id
      WHERE pr.status IN ('LOCKED','PAID','CLOSED')

      UNION ALL

      SELECT
        pp.id AS id,
        pp.paid_at AS date,
        'PAYMENT' AS type,
        CONCAT('PAYMENT ', to_char(pr.month, 'YYYY-MM')) AS reference,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        COALESCE(d.name, 'Company Overhead') AS division_name,
        pp.paid_amount AS debit,
        0 AS credit,
        pp.paid_at AS sort_ts
      FROM payroll_payment pp
      JOIN payroll_run pr ON pr.id = pp.payroll_run_id
      JOIN employee e ON e.id = pp.employee_id
      LEFT JOIN division d ON d.id = e.primary_division_id
      WHERE pr.status IN ('LOCKED','PAID','CLOSED')
    )
    SELECT
      e.id,
      e.date,
      e.type,
      e.reference,
      e.employee_name AS "employeeName",
      e.division_name AS "divisionName",
      e.debit,
      e.credit,
      SUM(e.credit - e.debit) OVER (ORDER BY e.date ASC, e.id ASC) AS balance
    FROM entries e
  `;

  const itemsSql = `
    ${baseSql}
    ${whereSql}
    ORDER BY date DESC, id DESC
    OFFSET $${params.length + 1} LIMIT $${params.length + 2}
  `;

  const countSql = `
    SELECT COUNT(1)::int AS c
    FROM (
      ${baseSql}
      ${whereSql}
    ) q
  `;

  const itemsParams = [...params, offset, limit];
  const [itemsRes, countRes] = await Promise.all([
    pool.query(itemsSql, itemsParams),
    pool.query(countSql, params)
  ]);

  return { items: itemsRes.rows, total: countRes.rows[0]?.c ?? 0 };
}
