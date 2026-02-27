export async function getUserById(client, { userId }) {
  const res = await client.query('SELECT * FROM "user" WHERE id = $1', [userId]);
  return res.rows[0] || null;
}

export async function getUserByEmployeeId(client, { employeeId }) {
  const res = await client.query('SELECT * FROM "user" WHERE employee_id = $1', [employeeId]);
  return res.rows[0] || null;
}

export async function updateUserEmployeeId(client, { userId, employeeId }) {
  const res = await client.query(
    `UPDATE "user"
     SET employee_id = $2,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId, employeeId]
  );

  return res.rows[0] || null;
}

export async function getEmployeeById(client, { employeeId }) {
  const res = await client.query('SELECT * FROM employee WHERE id = $1', [employeeId]);
  return res.rows[0] || null;
}

export async function getActiveEmployeeScopeHistory(client, { employeeId }) {
  const res = await client.query(
    `SELECT *
     FROM employee_scope_history
     WHERE employee_id = $1 AND effective_to IS NULL
     ORDER BY effective_from DESC
     LIMIT 1`,
    [employeeId]
  );
  return res.rows[0] || null;
}

export async function closeActiveEmployeeScopeHistory(client, { employeeId, effectiveTo }) {
  await client.query(
    `UPDATE employee_scope_history
     SET effective_to = $2
     WHERE employee_id = $1 AND effective_to IS NULL`,
    [employeeId, effectiveTo]
  );
}

export async function insertEmployeeScopeHistory(client, row) {
  await client.query(
    `INSERT INTO employee_scope_history (
      id, employee_id, scope, primary_division_id,
      effective_from, effective_to, reason, changed_at, changed_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      row.id,
      row.employee_id,
      row.scope,
      row.primary_division_id,
      row.effective_from,
      row.effective_to,
      row.reason,
      row.changed_at,
      row.changed_by
    ]
  );
}

export async function updateEmployeeScope(client, { employeeId, scope, primaryDivisionId, actorId }) {
  const res = await client.query(
    `UPDATE employee
     SET scope = $2,
         primary_division_id = $3,
         updated_at = NOW(),
         updated_by = $4,
         version = version + 1
     WHERE id = $1
     RETURNING *`,
    [employeeId, scope, primaryDivisionId || null, actorId]
  );

  return res.rows[0] || null;
}
