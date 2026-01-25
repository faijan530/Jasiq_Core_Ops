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
       closed_reason
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
      id, month, scope, status, closed_at, closed_by, closed_reason
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *`,
    [
      row.id,
      row.month,
      row.scope,
      row.status,
      row.closed_at || null,
      row.closed_by || null,
      row.closed_reason || null
    ]
  );
  return res.rows[0];
}

export async function updateMonthCloseStatus(client, { id, status, actorId, reason }) {
  const res = await client.query(
    `UPDATE month_close
     SET status = $2,
         closed_at = CASE WHEN $2 = 'CLOSED' THEN NOW() ELSE NULL END,
         closed_by = CASE WHEN $2 = 'CLOSED' THEN $3 ELSE NULL END,
         closed_reason = CASE WHEN $2 = 'CLOSED' THEN $4 ELSE NULL END
     WHERE id = $1
     RETURNING *`,
    [id, status, actorId, reason || null]
  );
  return res.rows[0] || null;
}
