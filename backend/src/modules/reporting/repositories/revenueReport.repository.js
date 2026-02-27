function buildGroupSelect(groupBy) {
  const g = String(groupBy || '').toUpperCase();

  if (g === 'DIVISION') {
    return {
      select: `
        i.division_id AS division_id,
        d.name AS division_name,
      `,
      groupBy: 'i.division_id, d.name',
      orderBy: 'division_name ASC'
    };
  }

  if (g === 'CATEGORY') {
    return {
      select: `
        i.category_id AS category_id,
        ic.name AS category_name,
      `,
      groupBy: 'i.category_id, ic.name',
      orderBy: 'category_name ASC'
    };
  }

  // MONTH (default)
  return {
    select: `
      date_trunc('month', i.income_date)::date AS month,
    `,
    groupBy: "date_trunc('month', i.income_date)::date",
    orderBy: 'month ASC'
  };
}

export async function queryRevenueReport(pool, { from, to, divisionId, categoryId, groupBy }) {
  const grp = buildGroupSelect(groupBy);

  const where = [`i.income_date BETWEEN $1::date AND $2::date`];
  const params = [from, to];
  let idx = 3;

  where.push("i.status IN ('APPROVED','PARTIALLY_PAID','PAID','CLOSED')");

  if (divisionId) {
    where.push(`i.division_id = $${idx++}::uuid`);
    params.push(divisionId);
  }

  if (categoryId) {
    where.push(`i.category_id = $${idx++}::uuid`);
    params.push(categoryId);
  }

  const sql = `
    SELECT
      ${grp.select}
      COALESCE(SUM(i.amount), 0) AS total_amount,
      COALESCE(SUM(ip.paid_amount), 0) AS paid_amount,
      COALESCE(SUM(i.amount), 0) - COALESCE(SUM(ip.paid_amount), 0) AS due_amount,
      COUNT(DISTINCT i.id)::int AS record_count
    FROM income i
    LEFT JOIN income_payment ip ON ip.income_id = i.id
    LEFT JOIN division d ON d.id = i.division_id
    LEFT JOIN income_category ic ON ic.id = i.category_id
    WHERE ${where.join(' AND ')}
    GROUP BY ${grp.groupBy}
    ORDER BY ${grp.orderBy}
  `;

  const res = await pool.query(sql, params);
  return res.rows || [];
}
