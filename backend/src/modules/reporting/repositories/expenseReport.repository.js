function buildGroupSelect(groupBy) {
  const g = String(groupBy || '').toUpperCase();

  if (g === 'DIVISION') {
    return {
      select: `
        e.division_id AS division_id,
        d.name AS division_name,
      `,
      groupBy: 'e.division_id, d.name',
      orderBy: 'division_name ASC'
    };
  }

  if (g === 'CATEGORY') {
    return {
      select: `
        e.category_id AS category_id,
        ec.name AS category_name,
      `,
      groupBy: 'e.category_id, ec.name',
      orderBy: 'category_name ASC'
    };
  }

  return {
    select: `
      date_trunc('month', e.expense_date)::date AS month,
    `,
    groupBy: "date_trunc('month', e.expense_date)::date",
    orderBy: 'month ASC'
  };
}

export async function queryExpenseReport(pool, { from, to, divisionId, categoryId, groupBy }) {
  const grp = buildGroupSelect(groupBy);

  const where = [`e.expense_date BETWEEN $1::date AND $2::date`];
  const params = [from, to];
  let idx = 3;

  where.push("e.status IN ('APPROVED','PAID','CLOSED')");

  if (divisionId) {
    where.push(`e.division_id = $${idx++}::uuid`);
    params.push(divisionId);
  }

  if (categoryId) {
    where.push(`e.category_id = $${idx++}::uuid`);
    params.push(categoryId);
  }

  const sql = `
    SELECT
      ${grp.select}
      COALESCE(SUM(e.amount), 0) AS total_amount,
      COALESCE(SUM(ep.paid_amount), 0) AS paid_amount,
      COALESCE(SUM(e.amount), 0) - COALESCE(SUM(ep.paid_amount), 0) AS due_amount,
      COUNT(DISTINCT e.id)::int AS record_count
    FROM expense e
    LEFT JOIN expense_payment ep ON ep.expense_id = e.id
    LEFT JOIN division d ON d.id = e.division_id
    LEFT JOIN expense_category ec ON ec.id = e.category_id
    WHERE ${where.join(' AND ')}
    GROUP BY ${grp.groupBy}
    ORDER BY ${grp.orderBy}
  `;

  const res = await pool.query(sql, params);
  return res.rows || [];
}
