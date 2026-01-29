export async function listLeaveTypes(client, { includeInactive }) {
  const res = await client.query(
    `SELECT
       id,
       code,
       name,
       is_paid,
       supports_half_day,
       affects_payroll,
       deduction_rule,
       is_active,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version
     FROM leave_type
     WHERE ($1::boolean IS TRUE OR is_active = TRUE)
     ORDER BY code ASC`,
    [includeInactive === true]
  );
  return res.rows;
}

export async function getLeaveTypeById(client, { id }) {
  const res = await client.query(
    `SELECT
       id,
       code,
       name,
       is_paid,
       supports_half_day,
       affects_payroll,
       deduction_rule,
       is_active,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version
     FROM leave_type
     WHERE id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

export async function getLeaveTypeByCode(client, { code }) {
  const res = await client.query(
    `SELECT
       id,
       code,
       name,
       is_paid,
       supports_half_day,
       affects_payroll,
       deduction_rule,
       is_active,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version
     FROM leave_type
     WHERE code = $1`,
    [String(code || '').trim().toUpperCase()]
  );
  return res.rows[0] || null;
}

export async function insertLeaveType(client, row) {
  const res = await client.query(
    `INSERT INTO leave_type (
       id, code, name,
       is_paid, supports_half_day,
       affects_payroll, deduction_rule,
       is_active,
       created_at, created_by,
       updated_at, updated_by,
       version
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,NOW(),$9,1)
     RETURNING *`,
    [
      row.id,
      row.code,
      row.name,
      row.is_paid,
      row.supports_half_day,
      row.affects_payroll,
      row.deduction_rule || null,
      row.is_active,
      row.actor_id
    ]
  );
  return res.rows[0];
}

export async function updateLeaveType(client, { id, patch, actorId, expectedVersion }) {
  const res = await client.query(
    `UPDATE leave_type
     SET
       code = COALESCE($2, code),
       name = COALESCE($3, name),
       is_paid = COALESCE($4, is_paid),
       supports_half_day = COALESCE($5, supports_half_day),
       affects_payroll = COALESCE($6, affects_payroll),
       deduction_rule = COALESCE($7, deduction_rule),
       is_active = COALESCE($8, is_active),
       updated_at = NOW(),
       updated_by = $9,
       version = version + 1
     WHERE id = $1
       AND version = $10
     RETURNING *`,
    [
      id,
      patch.code ?? null,
      patch.name ?? null,
      patch.is_paid ?? null,
      patch.supports_half_day ?? null,
      patch.affects_payroll ?? null,
      patch.deduction_rule ?? null,
      patch.is_active ?? null,
      actorId,
      expectedVersion
    ]
  );
  return res.rows[0] || null;
}
