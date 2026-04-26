export async function listActiveWorklogsForTimesheet(client, { timesheetId }) {
  const res = await client.query(
    `SELECT
       tw.id,
       tw.timesheet_id,
       to_char(tw.work_date, 'YYYY-MM-DD') AS work_date,
       tw.task,
       tw.hours,
       tw.description,
       tw.project_id,
       COALESCE(p.name, tw.project_name) AS project_name,
       tw.is_active,
       tw.archived_at,
       tw.archived_by,
       tw.archived_reason,
       tw.created_at,
       tw.created_by,
       tw.updated_at,
       tw.updated_by,
       tw.version
     FROM timesheet_worklog tw
     LEFT JOIN project p ON p.id = tw.project_id
     WHERE tw.timesheet_id = $1 AND tw.is_active = true
     ORDER BY tw.work_date ASC, tw.task ASC`,
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

export async function upsertWorklog(client, { id, timesheetId, workDate, task, hours, description, projectId, projectName, actorId }) {
  const res = await client.query(
    `INSERT INTO timesheet_worklog (
       id,
       timesheet_id,
       work_date,
       task,
       hours,
       description,
       project_id,
       project_name,
       is_active,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version
     ) VALUES ($1, $2, $3::date, $4, $5, $6, $7::uuid, $8, true, NOW(), $9, NOW(), $9, 1)
     ON CONFLICT (timesheet_id, work_date, task) WHERE is_active = true
     DO UPDATE SET
       hours = EXCLUDED.hours,
       description = EXCLUDED.description,
       project_id = EXCLUDED.project_id,
       project_name = EXCLUDED.project_name,
       updated_at = NOW(),
       updated_by = $9,
       version = timesheet_worklog.version + 1
     RETURNING
       id,
       timesheet_id,
       to_char(work_date, 'YYYY-MM-DD') AS work_date,
       task,
       hours,
       description,
       project_id,
       project_name,
       is_active,
       archived_at,
       archived_by,
       archived_reason,
       created_at,
       created_by,
       updated_at,
       updated_by,
       version`,
    [id, timesheetId, workDate, task, hours, description || null, projectId || null, projectName || null, actorId]
  );
  return res.rows[0] || null;
}
