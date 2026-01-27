export async function getEmployeeForAttendance(client, employeeId) {
  const res = await client.query(
    `SELECT
       e.*, 
       to_char(e.created_at, 'YYYY-MM-DD') AS created_at_date
     FROM employee e
     WHERE e.id = $1`,
    [employeeId]
  );
  return res.rows[0] || null;
}

export async function getAttendanceRecordByEmployeeDate(client, { employeeId, attendanceDate }) {
  const res = await client.query(
    `SELECT
       id,
       employee_id,
       to_char(attendance_date, 'YYYY-MM-DD') AS attendance_date,
       status,
       source,
       note,
       marked_by,
       marked_at,
       created_at,
       updated_at,
       version
     FROM attendance_record
     WHERE employee_id = $1 AND attendance_date = $2::date`,
    [employeeId, attendanceDate]
  );
  return res.rows[0] || null;
}

export async function insertAttendanceRecord(client, row) {
  const res = await client.query(
    `INSERT INTO attendance_record (
      id, employee_id, attendance_date,
      status, source, note,
      marked_by, marked_at,
      created_at, updated_at, version
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW(),NOW(),$8)
    ON CONFLICT (employee_id, attendance_date) DO NOTHING
    RETURNING
      id,
      employee_id,
      to_char(attendance_date, 'YYYY-MM-DD') AS attendance_date,
      status,
      source,
      note,
      marked_by,
      marked_at,
      created_at,
      updated_at,
      version`,
    [
      row.id,
      row.employee_id,
      row.attendance_date,
      row.status,
      row.source,
      row.note || null,
      row.marked_by,
      row.version
    ]
  );
  return res.rows[0] || null;
}

export async function updateAttendanceRecord(client, { id, status, source, note, markedBy }) {
  const res = await client.query(
    `UPDATE attendance_record
     SET status = $2,
         source = $3,
         note = $4,
         marked_by = $5,
         marked_at = NOW(),
         updated_at = NOW(),
         version = version + 1
     WHERE id = $1
     RETURNING
       id,
       employee_id,
       to_char(attendance_date, 'YYYY-MM-DD') AS attendance_date,
       status,
       source,
       note,
       marked_by,
       marked_at,
       created_at,
       updated_at,
       version`,
    [id, status, source, note || null, markedBy]
  );
  return res.rows[0] || null;
}

export async function listEmployeesForAttendance(client, { divisionId }) {
  const res = await client.query(
    `SELECT
       id,
       employee_code,
       first_name,
       last_name,
       email,
       status,
       scope,
       primary_division_id,
       to_char(created_at, 'YYYY-MM-DD') AS created_at_date
     FROM employee
     WHERE status = 'ACTIVE'
       AND ($1::uuid IS NULL OR primary_division_id = $1)
     ORDER BY employee_code ASC`,
    [divisionId || null]
  );
  return res.rows;
}

export async function listAttendanceRecordsForMonth(client, { startDate, endDate, divisionId }) {
  const res = await client.query(
    `SELECT
       ar.id,
       ar.employee_id,
       to_char(ar.attendance_date, 'YYYY-MM-DD') AS attendance_date,
       ar.status,
       ar.source,
       ar.note,
       ar.marked_by,
       ar.marked_at,
       ar.created_at,
       ar.updated_at,
       ar.version
     FROM attendance_record ar
     JOIN employee e ON e.id = ar.employee_id
     WHERE ar.attendance_date BETWEEN $1::date AND $2::date
       AND ($3::uuid IS NULL OR e.primary_division_id = $3)
     ORDER BY ar.attendance_date ASC`,
    [startDate, endDate, divisionId || null]
  );
  return res.rows;
}

export async function getMonthCloseStatus(client, { monthEndIso }) {
  const res = await client.query(
    `SELECT status
     FROM month_close
     WHERE scope = 'COMPANY' AND month::date = $1::date
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [monthEndIso]
  );
  return res.rows[0]?.status || 'OPEN';
}

export async function getTodayDateOnly(client) {
  const res = await client.query(`SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS today_date`);
  return res.rows[0]?.today_date || null;
}
