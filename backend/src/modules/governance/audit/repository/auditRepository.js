export async function countAuditLogs(client, filters) {
  const {
    entityType,
    entityId,
    action,
    severity,
    scope,
    divisionId,
    divisionIds,
    actorId,
    requestId,
    reasonContains,
    createdFrom,
    createdTo
  } = filters;

  const res = await client.query(
    `SELECT COUNT(*)::int AS c
     FROM audit_log
     WHERE ($1::text IS NULL OR entity_type = $1)
       AND ($2::uuid IS NULL OR entity_id = $2)
       AND ($3::text IS NULL OR action = $3)
       AND ($4::text IS NULL OR severity = $4)
       AND ($5::text IS NULL OR scope = $5)
       AND (
         ($6::uuid IS NOT NULL AND division_id = $6)
         OR ($6::uuid IS NULL AND $12::uuid[] IS NULL)
         OR ($6::uuid IS NULL AND division_id = ANY($12::uuid[]))
       )
       AND ($7::uuid IS NULL OR actor_id = $7)
       AND ($8::text IS NULL OR request_id = $8)
       AND ($9::text IS NULL OR reason ILIKE '%' || $9 || '%')
       AND ($10::timestamp IS NULL OR created_at >= $10)
       AND ($11::timestamp IS NULL OR created_at <= $11)`,
    [
      entityType || null,
      entityId || null,
      action || null,
      severity || null,
      scope || null,
      divisionId || null,
      actorId || null,
      requestId || null,
      reasonContains || null,
      createdFrom || null,
      createdTo || null,
      Array.isArray(divisionIds) && divisionIds.length ? divisionIds : null
    ]
  );
  return res.rows[0].c;
}

export async function listAuditLogs(client, { filters, offset, limit }) {
  const {
    entityType,
    entityId,
    action,
    severity,
    scope,
    divisionId,
    divisionIds,
    actorId,
    requestId,
    reasonContains,
    createdFrom,
    createdTo
  } = filters;

  const res = await client.query(
    `SELECT *
     FROM audit_log
     WHERE ($1::text IS NULL OR entity_type = $1)
       AND ($2::uuid IS NULL OR entity_id = $2)
       AND ($3::text IS NULL OR action = $3)
       AND ($4::text IS NULL OR severity = $4)
       AND ($5::text IS NULL OR scope = $5)
       AND (
         ($6::uuid IS NOT NULL AND division_id = $6)
         OR ($6::uuid IS NULL AND $12::uuid[] IS NULL)
         OR ($6::uuid IS NULL AND division_id = ANY($12::uuid[]))
       )
       AND ($7::uuid IS NULL OR actor_id = $7)
       AND ($8::text IS NULL OR request_id = $8)
       AND ($9::text IS NULL OR reason ILIKE '%' || $9 || '%')
       AND ($10::timestamp IS NULL OR created_at >= $10)
       AND ($11::timestamp IS NULL OR created_at <= $11)
     ORDER BY created_at DESC
     OFFSET $13 LIMIT $14`,
    [
      entityType || null,
      entityId || null,
      action || null,
      severity || null,
      scope || null,
      divisionId || null,
      actorId || null,
      requestId || null,
      reasonContains || null,
      createdFrom || null,
      createdTo || null,
      Array.isArray(divisionIds) && divisionIds.length ? divisionIds : null,
      offset,
      limit
    ]
  );

  return res.rows;
}

export async function listAuditTimeline(client, { entityType, entityId, offset, limit }) {
  const res = await client.query(
    `SELECT *
     FROM audit_log
     WHERE entity_type = $1
       AND entity_id = $2
     ORDER BY created_at DESC
     OFFSET $3 LIMIT $4`,
    [entityType, entityId, offset, limit]
  );

  return res.rows;
}

export async function countAuditTimeline(client, { entityType, entityId }) {
  const res = await client.query(
    `SELECT COUNT(*)::int AS c
     FROM audit_log
     WHERE entity_type = $1
       AND entity_id = $2`,
    [entityType, entityId]
  );

  return res.rows[0].c;
}
