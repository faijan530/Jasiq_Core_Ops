export async function countAuditLogs(client, filters) {
  const {
    entityType,
    entityId,
    action,
    actorId,
    requestId,
    createdFrom,
    createdTo
  } = filters;

  const res = await client.query(
    `SELECT COUNT(*)::int AS c
     FROM audit_log
     WHERE ($1::text IS NULL OR entity_type = $1)
       AND ($2::uuid IS NULL OR entity_id = $2)
       AND ($3::text IS NULL OR action = $3)
       AND ($4::uuid IS NULL OR actor_id = $4)
       AND ($5::text IS NULL OR request_id = $5)
       AND ($6::timestamp IS NULL OR created_at >= $6)
       AND ($7::timestamp IS NULL OR created_at <= $7)`,
    [
      entityType || null,
      entityId || null,
      action || null,
      actorId || null,
      requestId || null,
      createdFrom || null,
      createdTo || null
    ]
  );
  return res.rows[0].c;
}

export async function listAuditLogs(client, { filters, offset, limit }) {
  const {
    entityType,
    entityId,
    action,
    actorId,
    requestId,
    createdFrom,
    createdTo
  } = filters;

  const res = await client.query(
    `SELECT *
     FROM audit_log
     WHERE ($1::text IS NULL OR entity_type = $1)
       AND ($2::uuid IS NULL OR entity_id = $2)
       AND ($3::text IS NULL OR action = $3)
       AND ($4::uuid IS NULL OR actor_id = $4)
       AND ($5::text IS NULL OR request_id = $5)
       AND ($6::timestamp IS NULL OR created_at >= $6)
       AND ($7::timestamp IS NULL OR created_at <= $7)
     ORDER BY created_at DESC
     OFFSET $8 LIMIT $9`,
    [
      entityType || null,
      entityId || null,
      action || null,
      actorId || null,
      requestId || null,
      createdFrom || null,
      createdTo || null,
      offset,
      limit
    ]
  );

  return res.rows;
}
