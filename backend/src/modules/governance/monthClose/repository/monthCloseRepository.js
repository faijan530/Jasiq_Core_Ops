export async function getMonthClose(client, { month, scope }) {
  const res = await client.query(
    `SELECT *
     FROM month_close
     WHERE scope = $2
       AND month::date = $1::date
     ORDER BY (status = 'CLOSED') DESC, closed_at DESC NULLS LAST, month DESC
     LIMIT 1`,
    [month, scope]
  );
  return res.rows[0] || null;
}

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

export async function countMonthCloses(client) {
  const res = await client.query(
    `SELECT COUNT(DISTINCT month::date)::int AS c
     FROM month_close`
  );
  return res.rows[0].c;
}

export async function listMonthCloses(client, { offset, limit }) {
  const res = await client.query(
    `SELECT DISTINCT ON (month, scope)
       id,
       month,
       scope,
       status,
       closed_at,
       closed_by,
       closed_reason,
       opened_at,
       opened_by
     FROM month_close
     ORDER BY
       month DESC,
       scope ASC,
       (status = 'CLOSED') DESC,
       closed_at DESC NULLS LAST
     OFFSET $1 LIMIT $2`,
    [offset, limit]
  );
  return res.rows;
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

export async function updateMonthCloseStatus(client, { id, status, actorId, reason }) {
  if (status === 'CLOSED') {
    const res = await client.query(
      `UPDATE month_close
       SET status = 'CLOSED',
           closed_at = NOW(),
           closed_by = $2,
           closed_reason = $3,
           opened_at = NULL,
           opened_by = NULL
       WHERE id = $1
       RETURNING *`,
      [id, actorId, reason || null]
    );
    return res.rows[0] || null;
  }

  const res = await client.query(
    `UPDATE month_close
     SET status = 'OPEN',
         opened_at = NOW(),
         opened_by = $2,
         closed_at = NULL,
         closed_by = NULL,
         closed_reason = NULL
     WHERE id = $1
     RETURNING *`,
    [id, actorId]
  );
  return res.rows[0] || null;
}
