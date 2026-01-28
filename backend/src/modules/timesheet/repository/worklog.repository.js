export async function listActiveWorklogsForTimesheet(client, { timesheetId }) {
  const res = await client.query(
    `SELECT
       id,
       timesheet_id,
       to_char(work_date, 'YYYY-MM-DD') AS work_date,
       task,
       hours,
       description,
       project_id,
       is_active,
       archived_at,
       archived_by,
       archived_reason,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version
     FROM timesheet_worklog
     WHERE timesheet_id = $1 AND is_active = true
     ORDER BY work_date ASC, task ASC`,
    [timesheetId]
  );
  return res.rows;
}

export async function sumActiveHoursForDate(client, { timesheetId, workDate }) {
  const res = await client.query(
    `SELECT COALESCE(SUM(hours), 0)::numeric AS total
     FROM timesheet_worklog
     WHERE timesheet_id = $1
       AND is_active = true
       AND work_date = $2::date`,
    [timesheetId, workDate]
  );
  return Number(res.rows[0]?.total || 0);
}

export async function upsertWorklog(client, { id, timesheetId, workDate, task, hours, description, projectId, actorId }) {
  const res = await client.query(
    `INSERT INTO timesheet_worklog (
       id,
       timesheet_id,
       work_date,
       task,
       hours,
       description,
       project_id,
       is_active,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version
     ) VALUES ($1, $2, $3::date, $4, $5, $6, $7::uuid, true, NOW(), $8, NOW(), $8, 1)
     ON CONFLICT (timesheet_id, work_date, task) WHERE is_active = true
     DO UPDATE SET
       hours = EXCLUDED.hours,
       description = EXCLUDED.description,
       project_id = EXCLUDED.project_id,
       updated_at = NOW(),
       updated_by = $8,
       version = timesheet_worklog.version + 1
     RETURNING
       id,
       timesheet_id,
       to_char(work_date, 'YYYY-MM-DD') AS work_date,
       task,
       hours,
       description,
       project_id,
       is_active,
       archived_at,
       archived_by,
       archived_reason,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version`,
    [id, timesheetId, workDate, task, hours, description || null, projectId || null, actorId]
  );
  return res.rows[0] || null;
}
