export async function insertIncome(client, row) {
  const res = await client.query(
    `INSERT INTO income (
       id,
       income_date,
       category_id,
       client_id,
       invoice_number,
       title,
       description,
       amount,
       currency,
       division_id,
       status,
       submitted_at,
       submitted_by,
       approved_at,
       approved_by,
       rejected_at,
       rejected_by,
       decision_reason,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version
     ) VALUES (
       $1,$2::date,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
       NOW(),$19,NOW(),$19,$20
     )
     RETURNING *`,
    [
      row.id,
      row.income_date,
      row.category_id,
      row.client_id,
      row.invoice_number,
      row.title,
      row.description,
      row.amount,
      row.currency,
      row.division_id,
      row.status,
      row.submitted_at,
      row.submitted_by,
      row.approved_at,
      row.approved_by,
      row.rejected_at,
      row.rejected_by,
      row.decision_reason,
      row.created_by,
      row.version
    ]
  );
  return res.rows[0];
}

export async function getIncomeDivisionId(client, { id }) {
  const res = await client.query('SELECT division_id FROM income WHERE id = $1', [id]);
  return res.rows[0]?.division_id || null;
}

export async function getIncomeById(client, { id, forUpdate = false }) {
  const sql = forUpdate
    ? `WITH locked AS (
         SELECT *
         FROM income
         WHERE id = $1
         FOR UPDATE
       )
       SELECT locked.*,
              ic.name AS category_name,
              c.name AS client_name
       FROM locked
       LEFT JOIN income_category ic ON locked.category_id = ic.id
       LEFT JOIN client c ON locked.client_id = c.id`
    : `SELECT i.*,
              ic.name AS category_name,
              c.name AS client_name
       FROM income i
       LEFT JOIN income_category ic ON i.category_id = ic.id
       LEFT JOIN client c ON i.client_id = c.id
       WHERE i.id = $1`;

  const res = await client.query(sql, [id]);
  return res.rows[0] || null;
}

export async function updateIncomeDraft(client, { id, patch, actorId, expectedVersion }) {
  const res = await client.query(
    `UPDATE income
     SET
       income_date = COALESCE($2::date, income_date),
       category_id = COALESCE($3::uuid, category_id),
       client_id = COALESCE($4::uuid, client_id),
       invoice_number = COALESCE($5, invoice_number),
       title = COALESCE($6, title),
       description = COALESCE($7, description),
       amount = COALESCE($8::numeric, amount),
       currency = COALESCE($9, currency),
       division_id = COALESCE($10::uuid, division_id),
       updated_at = NOW(),
       updated_by = $11,
       version = version + 1
     WHERE id = $1 AND version = $12
     RETURNING *`,
    [
      id,
      patch.income_date ?? null,
      patch.category_id ?? null,
      patch.client_id ?? null,
      patch.invoice_number ?? null,
      patch.title ?? null,
      patch.description ?? null,
      patch.amount ?? null,
      patch.currency ?? null,
      patch.division_id ?? null,
      actorId,
      expectedVersion
    ]
  );
  return res.rows[0] || null;
}

export async function updateIncomeState(client, { id, status, fields, actorId, expectedVersion }) {
  const f = fields || {};
  const res = await client.query(
    `UPDATE income
     SET
       status = $2,
       submitted_at = COALESCE($3, submitted_at),
       submitted_by = COALESCE($4, submitted_by),
       approved_at = COALESCE($5, approved_at),
       approved_by = COALESCE($6, approved_by),
       rejected_at = COALESCE($7, rejected_at),
       rejected_by = COALESCE($8, rejected_by),
       decision_reason = COALESCE($9, decision_reason),
       updated_at = NOW(),
       updated_by = $10,
       version = version + 1
     WHERE id = $1 AND version = $11
     RETURNING *`,
    [
      id,
      status,
      f.submitted_at ?? null,
      f.submitted_by ?? null,
      f.approved_at ?? null,
      f.approved_by ?? null,
      f.rejected_at ?? null,
      f.rejected_by ?? null,
      f.decision_reason ?? null,
      actorId,
      expectedVersion
    ]
  );
  return res.rows[0] || null;
}

export async function listIncomes(client, {
  status,
  divisionId,
  categoryId,
  clientId,
  from,
  to,
  search,
  offset,
  limit
}) {
  const where = [];
  const params = [];
  let idx = 1;

  if (status) {
    where.push(`i.status = $${idx++}`);
    params.push(status);
  }
  if (divisionId) {
    where.push(`i.division_id = $${idx++}::uuid`);
    params.push(divisionId);
  }
  if (categoryId) {
    where.push(`i.category_id = $${idx++}::uuid`);
    params.push(categoryId);
  }
  if (clientId) {
    where.push(`i.client_id = $${idx++}::uuid`);
    params.push(clientId);
  }
  if (from) {
    where.push(`i.income_date >= $${idx++}::date`);
    params.push(from);
  }
  if (to) {
    where.push(`i.income_date <= $${idx++}::date`);
    params.push(to);
  }
  if (search) {
    where.push(`(i.title ILIKE $${idx++} OR i.invoice_number ILIKE $${idx++})`);
    const q = `%${String(search).trim()}%`;
    params.push(q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM income i ${whereSql}`, params);
  const total = countRes.rows[0]?.cnt || 0;

  params.push(limit);
  params.push(offset);

  const rowsRes = await client.query(
    `SELECT i.*,
            ic.name AS category_name,
            c.name AS client_name
     FROM income i
     LEFT JOIN income_category ic ON i.category_id = ic.id
     LEFT JOIN client c ON i.client_id = c.id
     ${whereSql}
     ORDER BY i.income_date DESC, i.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );

  return { items: rowsRes.rows, total };
}
