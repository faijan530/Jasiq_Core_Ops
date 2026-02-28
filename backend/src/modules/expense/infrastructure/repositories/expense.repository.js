export async function insertExpense(client, row) {
  const res = await client.query(
    `INSERT INTO expense (
       id,
       expense_date,
       category_id,
       title,
       description,
       amount,
       currency,
       division_id,
       project_id,
       paid_by_method,
       vendor_name,
       is_reimbursement,
       employee_id,
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
       $1,$2::date,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
       $15,$16,$17,$18,$19,$20,$21,
       NOW(),$22,NOW(),$22,$23
     )
     RETURNING *`,
    [
      row.id,
      row.expense_date,
      row.category_id,
      row.title,
      row.description,
      row.amount,
      row.currency,
      row.division_id,
      row.project_id,
      row.paid_by_method,
      row.vendor_name,
      row.is_reimbursement,
      row.employee_id,
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

export async function getEmployeeIdByUserId(client, { userId }) {
  const res = await client.query('SELECT employee_id FROM "user" WHERE id = $1', [userId]);
  return res.rows[0]?.employee_id || null;
}

export async function getExpenseById(client, { id, forUpdate = false }) {
  const sql = forUpdate
    ? `WITH locked AS (
         SELECT *
         FROM expense
         WHERE id = $1
         FOR UPDATE
       )
       SELECT locked.*,
              ec.name AS category_name,
              CONCAT(emp.first_name, ' ', emp.last_name) AS employee_name
       FROM locked
       LEFT JOIN expense_category ec ON locked.category_id = ec.id
       LEFT JOIN employee emp ON locked.employee_id = emp.id`
    : `SELECT e.*,
              ec.name AS category_name,
              CONCAT(emp.first_name, ' ', emp.last_name) AS employee_name
       FROM expense e
       LEFT JOIN expense_category ec ON e.category_id = ec.id
       LEFT JOIN employee emp ON e.employee_id = emp.id
       WHERE e.id = $1`;

  const res = await client.query(sql, [id]);
  return res.rows[0] || null;
}

export async function getExpenseDivisionId(client, { id }) {
  const res = await client.query('SELECT division_id FROM expense WHERE id = $1', [id]);
  return res.rows[0]?.division_id || null;
}

export async function updateExpenseDraft(client, { id, patch, actorId, expectedVersion }) {
  const res = await client.query(
    `UPDATE expense
     SET
       expense_date = COALESCE($2::date, expense_date),
       category_id = COALESCE($3::uuid, category_id),
       title = COALESCE($4, title),
       description = COALESCE($5, description),
       amount = COALESCE($6::numeric, amount),
       currency = COALESCE($7, currency),
       division_id = COALESCE($8::uuid, division_id),
       project_id = COALESCE($9::uuid, project_id),
       paid_by_method = COALESCE($10, paid_by_method),
       vendor_name = COALESCE($11, vendor_name),
       is_reimbursement = COALESCE($12::boolean, is_reimbursement),
       employee_id = COALESCE($13::uuid, employee_id),
       updated_at = NOW(),
       updated_by = $14,
       version = version + 1
     WHERE id = $1 AND version = $15
     RETURNING *`,
    [
      id,
      patch.expense_date ?? null,
      patch.category_id ?? null,
      patch.title ?? null,
      patch.description ?? null,
      patch.amount ?? null,
      patch.currency ?? null,
      patch.division_id ?? null,
      patch.project_id ?? null,
      patch.paid_by_method ?? null,
      patch.vendor_name ?? null,
      patch.is_reimbursement ?? null,
      patch.employee_id ?? null,
      actorId,
      expectedVersion
    ]
  );
  return res.rows[0] || null;
}

export async function updateExpenseState(client, { id, status, fields, actorId, expectedVersion }) {
  const res = await client.query(
    `UPDATE expense
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
      fields.submitted_at ?? null,
      fields.submitted_by ?? null,
      fields.approved_at ?? null,
      fields.approved_by ?? null,
      fields.rejected_at ?? null,
      fields.rejected_by ?? null,
      fields.decision_reason ?? null,
      actorId,
      expectedVersion
    ]
  );
  return res.rows[0] || null;
}

export async function listExpenses(client, {
  status,
  divisionId,
  categoryId,
  from,
  to,
  minAmount,
  maxAmount,
  reimbursement,
  search,
  offset,
  limit
}) {
  const where = [];
  const params = [];
  let idx = 1;

  if (status) {
    where.push(`e.status = $${idx++}`);
    params.push(status);
  }
  if (divisionId) {
    where.push(`e.division_id = $${idx++}::uuid`);
    params.push(divisionId);
  }
  if (categoryId) {
    where.push(`e.category_id = $${idx++}::uuid`);
    params.push(categoryId);
  }
  if (from) {
    where.push(`e.expense_date >= $${idx++}::date`);
    params.push(from);
  }
  if (to) {
    where.push(`e.expense_date <= $${idx++}::date`);
    params.push(to);
  }
  if (minAmount !== null && minAmount !== undefined) {
    where.push(`e.amount >= $${idx++}::numeric`);
    params.push(minAmount);
  }
  if (maxAmount !== null && maxAmount !== undefined) {
    where.push(`e.amount <= $${idx++}::numeric`);
    params.push(maxAmount);
  }
  if (reimbursement !== null && reimbursement !== undefined) {
    where.push(`e.is_reimbursement = $${idx++}::boolean`);
    params.push(Boolean(reimbursement));
  }
  if (search) {
    where.push(`(e.title ILIKE $${idx++} OR e.vendor_name ILIKE $${idx++})`);
    const q = `%${String(search).trim()}%`;
    params.push(q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countParams = [...params];
  const totalPromise = client.query(
    `SELECT COUNT(*)::int AS cnt FROM expense e ${whereSql}`,
    countParams
  );

  const rowsParams = [...params, limit, offset];
  const rowsPromise = client.query(
    `SELECT e.*,
            ec.name AS category_name,
            CONCAT(emp.first_name, ' ', emp.last_name) AS employee_name
     FROM expense e
     LEFT JOIN expense_category ec ON e.category_id = ec.id
     LEFT JOIN employee emp ON e.employee_id = emp.id
     ${whereSql}
     ORDER BY e.expense_date DESC, e.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    rowsParams
  );

  const [countRes, rowsRes] = await Promise.all([totalPromise, rowsPromise]);
  const total = countRes.rows[0]?.cnt || 0;

  return { items: rowsRes.rows, total };
}
