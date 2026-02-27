export async function getLeaveBalance(client, { employeeId, leaveTypeId, year, forUpdate }) {
  const lock = forUpdate ? ' FOR UPDATE' : '';
  const res = await client.query(
    `SELECT *
     FROM leave_balance
     WHERE employee_id = $1
       AND leave_type_id = $2
       AND year = $3
     ${lock}`,
    [employeeId, leaveTypeId, year]
  );
  return res.rows[0] || null;
}

export async function listLeaveBalances(client, { employeeId, year }) {
  const res = await client.query(
    `SELECT
       lb.id,
       lb.employee_id,
       lb.leave_type_id,
       lb.year,
       lb.opening_balance,
       lb.granted_balance,
       lb.consumed_balance,
       lb.available_balance,
       lb.created_at,
       lb.created_by,
       lb.updated_at,
       lb.updated_by,
       lb.version,
       lt.code AS leave_type_code,
       lt.name AS leave_type_name,
       lt.is_paid AS leave_type_is_paid,
       e.employee_code,
       e.first_name,
       e.last_name,
       -- Get the latest audit reason for this balance
       (
         SELECT al.reason
         FROM audit_log al
         WHERE al.entity_type = 'LEAVE_BALANCE'
           AND al.entity_id = lb.id
         ORDER BY al.created_at DESC
         LIMIT 1
       ) AS reason
     FROM leave_balance lb
     JOIN leave_type lt ON lt.id = lb.leave_type_id
     JOIN employee e ON e.id = lb.employee_id
     WHERE ($1::uuid IS NULL OR lb.employee_id = $1)
       AND ($2::int IS NULL OR lb.year = $2)
     ORDER BY lb.year DESC, lt.code ASC`,
    [employeeId || null, year ?? null]
  );
  return res.rows;
}

export async function insertLeaveBalance(client, row) {
  const res = await client.query(
    `INSERT INTO leave_balance (
       id,
       employee_id,
       leave_type_id,
       year,
       opening_balance,
       granted_balance,
       consumed_balance,
       available_balance,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,NOW(),$9,1)
     RETURNING *`,
    [
      row.id,
      row.employee_id,
      row.leave_type_id,
      row.year,
      row.opening_balance,
      row.granted_balance,
      row.consumed_balance,
      row.available_balance,
      row.actor_id
    ]
  );
  return res.rows[0];
}

export async function updateLeaveBalance(client, { id, openingBalance, grantedBalance, consumedBalance, availableBalance, actorId, expectedVersion }) {
  const res = await client.query(
    `UPDATE leave_balance
     SET opening_balance = $2,
         granted_balance = $3,
         consumed_balance = $4,
         available_balance = $5,
         updated_at = NOW(),
         updated_by = $6,
         version = version + 1
     WHERE id = $1
       AND version = $7
     RETURNING *`,
    [id, openingBalance, grantedBalance, consumedBalance, availableBalance, actorId, expectedVersion]
  );
  return res.rows[0] || null;
}
