export async function getLeaveRequestById(client, { id, forUpdate }) {
  const lock = forUpdate ? ' FOR UPDATE' : '';
  const res = await client.query(
    `SELECT
       lr.id,
       lr.employee_id,
       lr.leave_type_id,
       to_char(lr.start_date, 'YYYY-MM-DD') AS start_date,
       to_char(lr.end_date, 'YYYY-MM-DD') AS end_date,
       lr.unit,
       lr.half_day_part,
       lr.units,
       lr.reason,
       lr.status,
       lr.approved_l1_by,
       lr.approved_l1_at,
       lr.approved_l2_by,
       lr.approved_l2_at,
       lr.rejected_by,
       lr.rejected_at,
       lr.rejection_reason,
       lr.cancelled_by,
       lr.cancelled_at,
       lr.cancel_reason,
       lr.created_at,
       lr.updated_at,
       lr.version
     FROM leave_request lr
     WHERE lr.id = $1${lock}`,
    [id]
  );
  return res.rows[0] || null;
}

export async function findOverlappingLeaveRequests(client, { employeeId, startDate, endDate, excludeId }) {
  const res = await client.query(
    `SELECT id
     FROM leave_request
     WHERE employee_id = $1
       AND status IN ('SUBMITTED','APPROVED')
       AND NOT ($2::date > end_date OR $3::date < start_date)
       AND ($4::uuid IS NULL OR id <> $4)
     LIMIT 1`,
    [employeeId, startDate, endDate, excludeId || null]
  );
  return res.rows[0]?.id || null;
}

export async function insertLeaveRequest(client, row) {
  const res = await client.query(
    `INSERT INTO leave_request (
       id, employee_id, leave_type_id,
       start_date, end_date,
       unit, half_day_part,
       units, reason,
       status,
       created_at, updated_at, version
     ) VALUES ($1,$2,$3,$4::date,$5::date,$6,$7,$8,$9,$10,NOW(),NOW(),1)
     RETURNING *`,
    [
      row.id,
      row.employee_id,
      row.leave_type_id,
      row.start_date,
      row.end_date,
      row.unit,
      row.half_day_part || null,
      row.units,
      row.reason,
      row.status
    ]
  );
  return res.rows[0];
}

export async function updateLeaveRequestStatus(client, { id, status, fields, expectedVersion }) {
  const res = await client.query(
    `UPDATE leave_request
     SET status = $2,
         approved_l1_by = COALESCE($3, approved_l1_by),
         approved_l1_at = COALESCE($4, approved_l1_at),
         approved_l2_by = COALESCE($5, approved_l2_by),
         approved_l2_at = COALESCE($6, approved_l2_at),
         rejected_by = COALESCE($7, rejected_by),
         rejected_at = COALESCE($8, rejected_at),
         rejection_reason = COALESCE($9, rejection_reason),
         cancelled_by = COALESCE($10, cancelled_by),
         cancelled_at = COALESCE($11, cancelled_at),
         cancel_reason = COALESCE($12, cancel_reason),
         updated_at = NOW(),
         version = version + 1
     WHERE id = $1
       AND version = $13
     RETURNING *`,
    [
      id,
      status,
      fields.approved_l1_by ?? null,
      fields.approved_l1_at ?? null,
      fields.approved_l2_by ?? null,
      fields.approved_l2_at ?? null,
      fields.rejected_by ?? null,
      fields.rejected_at ?? null,
      fields.rejection_reason ?? null,
      fields.cancelled_by ?? null,
      fields.cancelled_at ?? null,
      fields.cancel_reason ?? null,
      expectedVersion
    ]
  );
  return res.rows[0] || null;
}

export async function listLeaveRequests(client, { employeeId, status, divisionId, offset, limit }) {
  const res = await client.query(
    `SELECT
       lr.id,
       lr.employee_id,
       lr.leave_type_id,
       to_char(lr.start_date, 'YYYY-MM-DD') AS start_date,
       to_char(lr.end_date, 'YYYY-MM-DD') AS end_date,
       lr.unit,
       lr.half_day_part,
       lr.units,
       lr.reason,
       lr.status,
       lr.approved_l1_by,
       lr.approved_l1_at,
       lr.approved_l2_by,
       lr.approved_l2_at,
       lr.rejected_by,
       lr.rejected_at,
       lr.rejection_reason,
       lr.cancelled_by,
       lr.cancelled_at,
       lr.cancel_reason,
       lr.created_at,
       lr.updated_at,
       lr.version,
       e.employee_code,
       e.first_name,
       e.last_name,
       e.primary_division_id,
       lt.code AS leave_type_code,
       lt.name AS leave_type_name,
       lt.is_paid AS leave_type_is_paid
     FROM leave_request lr
     JOIN employee e ON e.id = lr.employee_id
     JOIN leave_type lt ON lt.id = lr.leave_type_id
     WHERE ($1::uuid IS NULL OR lr.employee_id = $1)
       AND ($2::text IS NULL OR lr.status = $2)
       AND ($3::uuid IS NULL OR e.primary_division_id = $3)
     ORDER BY lr.updated_at DESC, lr.created_at DESC
     OFFSET $4 LIMIT $5`,
    [employeeId || null, status || null, divisionId || null, offset, limit]
  );
  return res.rows;
}

export async function countLeaveRequests(client, { employeeId, status, divisionId }) {
  const res = await client.query(
    `SELECT COUNT(*)::int AS c
     FROM leave_request lr
     JOIN employee e ON e.id = lr.employee_id
     WHERE ($1::uuid IS NULL OR lr.employee_id = $1)
       AND ($2::text IS NULL OR lr.status = $2)
       AND ($3::uuid IS NULL OR e.primary_division_id = $3)`,
    [employeeId || null, status || null, divisionId || null]
  );
  return res.rows[0]?.c || 0;
}
