export async function getLatestMonthClose(client, { month, scope }) {
  const res = await client.query(
    `SELECT *
     FROM month_close
     WHERE scope = $2
       AND month::date = $1::date
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [month, scope]
  );
  return res.rows[0] || null;
}

export async function insertMonthClose(client, row) {
  const res = await client.query(
    `INSERT INTO month_close (
      id, month, scope, status, closed_at, closed_by, closed_reason, opened_at, opened_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *`,
    [
      row.id,
      row.month,
      row.scope,
      row.status,
      row.closed_at || null,
      row.closed_by || null,
      row.closed_reason || null,
      row.opened_at || null,
      row.opened_by || null
    ]
  );
  return res.rows[0];
}
