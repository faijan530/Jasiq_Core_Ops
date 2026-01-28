export async function getEmployeeForTimesheet(client, employeeId) {
  const res = await client.query(
    `SELECT
       id,
       status,
       scope,
       primary_division_id,
       to_char(created_at, 'YYYY-MM-DD') AS created_at_date
     FROM employee
     WHERE id = $1`,
    [employeeId]
  );
  return res.rows[0] || null;
}

export async function getTodayDateOnly(client) {
  const res = await client.query(`SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS today_date`);
  return res.rows[0]?.today_date || null;
}

export async function getTimesheetHeaderByIdForUpdate(client, { id }) {
  const res = await client.query(
    `SELECT
       id,
       employee_id,
       period_type,
       to_char(period_start, 'YYYY-MM-DD') AS period_start,
       to_char(period_end, 'YYYY-MM-DD') AS period_end,
       status,
       locked,
       submitted_at,
       submitted_by,
       approved_l1_at,
       approved_l1_by,
       approved_l2_at,
       approved_l2_by,
       rejected_at,
       rejected_by,
       rejected_reason,
       revision_requested_at,
       revision_requested_by,
       revision_requested_reason,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version
     FROM timesheet_header
     WHERE id = $1
     FOR UPDATE`,
    [id]
  );
  return res.rows[0] || null;
}

export async function getTimesheetHeaderById(client, { id }) {
  const res = await client.query(
    `SELECT
       id,
       employee_id,
       period_type,
       to_char(period_start, 'YYYY-MM-DD') AS period_start,
       to_char(period_end, 'YYYY-MM-DD') AS period_end,
       status,
       locked,
       submitted_at,
       submitted_by,
       approved_l1_at,
       approved_l1_by,
       approved_l2_at,
       approved_l2_by,
       rejected_at,
       rejected_by,
       rejected_reason,
       revision_requested_at,
       revision_requested_by,
       revision_requested_reason,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version
     FROM timesheet_header
     WHERE id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

export async function getTimesheetHeaderByEmployeePeriodForUpdate(client, { employeeId, periodType, periodStart, periodEnd }) {
  const res = await client.query(
    `SELECT
       id,
       employee_id,
       period_type,
       to_char(period_start, 'YYYY-MM-DD') AS period_start,
       to_char(period_end, 'YYYY-MM-DD') AS period_end,
       status,
       locked,
       submitted_at,
       submitted_by,
       approved_l1_at,
       approved_l1_by,
       approved_l2_at,
       approved_l2_by,
       rejected_at,
       rejected_by,
       rejected_reason,
       revision_requested_at,
       revision_requested_by,
       revision_requested_reason,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version
     FROM timesheet_header
     WHERE employee_id = $1
       AND period_type = $2
       AND period_start = $3::date
       AND period_end = $4::date
     FOR UPDATE`,
    [employeeId, periodType, periodStart, periodEnd]
  );
  return res.rows[0] || null;
}

export async function insertTimesheetHeader(client, row) {
  const res = await client.query(
    `INSERT INTO timesheet_header (
       id, employee_id,
       period_type, period_start, period_end,
       status, locked,
       created_at, created_by,
       updated_at, updated_by,
       version
     ) VALUES ($1,$2,$3,$4::date,$5::date,$6,$7,NOW(),$8,NOW(),$8,1)
     RETURNING
       id,
       employee_id,
       period_type,
       to_char(period_start, 'YYYY-MM-DD') AS period_start,
       to_char(period_end, 'YYYY-MM-DD') AS period_end,
       status,
       locked,
       submitted_at,
       submitted_by,
       approved_l1_at,
       approved_l1_by,
       approved_l2_at,
       approved_l2_by,
       rejected_at,
       rejected_by,
       rejected_reason,
       revision_requested_at,
       revision_requested_by,
       revision_requested_reason,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version`,
    [
      row.id,
      row.employee_id,
      row.period_type,
      row.period_start,
      row.period_end,
      row.status,
      row.locked,
      row.actor_id
    ]
  );
  return res.rows[0] || null;
}

export async function updateTimesheetHeaderState(client, {
  id,
  status,
  locked,
  actorId,
  setSubmitted,
  setApprovedL1,
  setApprovedL2,
  setRejected,
  setRevisionRequested,
  clearDecisions
}) {
  const res = await client.query(
    `UPDATE timesheet_header
     SET status = $2,
         locked = $3,
         submitted_at = CASE WHEN $4::boolean THEN NOW() ELSE submitted_at END,
         submitted_by = CASE WHEN $4::boolean THEN $5 ELSE submitted_by END,
         approved_l1_at = CASE WHEN $6::boolean THEN NOW() ELSE CASE WHEN $12::boolean THEN NULL ELSE approved_l1_at END END,
         approved_l1_by = CASE WHEN $6::boolean THEN $5 ELSE CASE WHEN $12::boolean THEN NULL ELSE approved_l1_by END END,
         approved_l2_at = CASE WHEN $7::boolean THEN NOW() ELSE CASE WHEN $12::boolean THEN NULL ELSE approved_l2_at END END,
         approved_l2_by = CASE WHEN $7::boolean THEN $5 ELSE CASE WHEN $12::boolean THEN NULL ELSE approved_l2_by END END,
         rejected_at = CASE WHEN $8::boolean THEN NOW() ELSE CASE WHEN $12::boolean THEN NULL ELSE rejected_at END END,
         rejected_by = CASE WHEN $8::boolean THEN $5 ELSE CASE WHEN $12::boolean THEN NULL ELSE rejected_by END END,
         rejected_reason = CASE WHEN $8::boolean THEN $9 ELSE CASE WHEN $12::boolean THEN NULL ELSE rejected_reason END END,
         revision_requested_at = CASE WHEN $10::boolean THEN NOW() ELSE CASE WHEN $12::boolean THEN NULL ELSE revision_requested_at END END,
         revision_requested_by = CASE WHEN $10::boolean THEN $5 ELSE CASE WHEN $12::boolean THEN NULL ELSE revision_requested_by END END,
         revision_requested_reason = CASE WHEN $10::boolean THEN $11 ELSE CASE WHEN $12::boolean THEN NULL ELSE revision_requested_reason END END,
         updated_at = NOW(),
         updated_by = $5,
         version = version + 1
     WHERE id = $1
     RETURNING
       id,
       employee_id,
       period_type,
       to_char(period_start, 'YYYY-MM-DD') AS period_start,
       to_char(period_end, 'YYYY-MM-DD') AS period_end,
       status,
       locked,
       submitted_at,
       submitted_by,
       approved_l1_at,
       approved_l1_by,
       approved_l2_at,
       approved_l2_by,
       rejected_at,
       rejected_by,
       rejected_reason,
       revision_requested_at,
       revision_requested_by,
       revision_requested_reason,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version`,
    [
      id,
      status,
      Boolean(locked),
      Boolean(setSubmitted),
      actorId,
      Boolean(setApprovedL1),
      Boolean(setApprovedL2),
      Boolean(setRejected),
      setRejected ? String(setRejected.reason || '') : null,
      Boolean(setRevisionRequested),
      setRevisionRequested ? String(setRevisionRequested.reason || '') : null,
      Boolean(clearDecisions)
    ]
  );
  return res.rows[0] || null;
}

export async function listTimesheetsForEmployee(client, { employeeId, offset, limit }) {
  const res = await client.query(
    `SELECT
       id,
       employee_id,
       period_type,
       to_char(period_start, 'YYYY-MM-DD') AS period_start,
       to_char(period_end, 'YYYY-MM-DD') AS period_end,
       status,
       locked,
       submitted_at,
       submitted_by,
       approved_l1_at,
       approved_l1_by,
       approved_l2_at,
       approved_l2_by,
       rejected_at,
       rejected_by,
       rejected_reason,
       revision_requested_at,
       revision_requested_by,
       revision_requested_reason,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version
     FROM timesheet_header
     WHERE employee_id = $1
     ORDER BY period_start DESC, created_at DESC
     OFFSET $2 LIMIT $3`,
    [employeeId, offset, limit]
  );
  return res.rows;
}

export async function countTimesheetsForEmployee(client, { employeeId }) {
  const res = await client.query('SELECT COUNT(*)::int AS c FROM timesheet_header WHERE employee_id = $1', [employeeId]);
  return res.rows[0]?.c || 0;
}

export async function listApprovalsQueue(client, { divisionId, offset, limit, levels }) {
  const res = await client.query(
    `SELECT
       th.id,
       th.employee_id,
       th.period_type,
       to_char(th.period_start, 'YYYY-MM-DD') AS period_start,
       to_char(th.period_end, 'YYYY-MM-DD') AS period_end,
       th.status,
       th.locked,
       th.approved_l1_at,
       th.approved_l1_by,
       th.created_at,
       th.updated_at,
       th.version,
       e.employee_code,
       e.first_name,
       e.last_name,
       e.primary_division_id
     FROM timesheet_header th
     JOIN employee e ON e.id = th.employee_id
     WHERE th.status = 'SUBMITTED'
       AND ($1::uuid IS NULL OR e.primary_division_id = $1)
     ORDER BY th.updated_at DESC, th.created_at DESC
     OFFSET $2 LIMIT $3`,
    [divisionId || null, offset, limit]
  );
  return res.rows;
}

export async function countApprovalsQueue(client, { divisionId }) {
  const res = await client.query(
    `SELECT COUNT(*)::int AS c
     FROM timesheet_header th
     JOIN employee e ON e.id = th.employee_id
     WHERE th.status = 'SUBMITTED'
       AND ($1::uuid IS NULL OR e.primary_division_id = $1)`,
    [divisionId || null]
  );
  return res.rows[0]?.c || 0;
}
