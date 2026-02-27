export async function listPayrollItemsByRun(client, { payrollRunId }) {
  const res = await client.query(
    `SELECT
       pi.*,
       TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
       e.employee_code AS employee_code,
       d.name AS division_name
     FROM payroll_item pi
     JOIN employee e ON e.id = pi.employee_id
     LEFT JOIN division d ON d.id = pi.division_id
     WHERE pi.payroll_run_id = $1
     ORDER BY pi.employee_id ASC, pi.item_type ASC, pi.description ASC`,
    [payrollRunId]
  );
  return res.rows;
}

export async function listPayrollItemsByRunEmployee(client, { payrollRunId, employeeId }) {
  const res = await client.query(
    `SELECT
       pi.*,
       TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
       e.employee_code AS employee_code,
       d.name AS division_name
     FROM payroll_item pi
     JOIN employee e ON e.id = pi.employee_id
     LEFT JOIN division d ON d.id = pi.division_id
     WHERE pi.payroll_run_id = $1 AND pi.employee_id = $2
     ORDER BY pi.item_type ASC, pi.description ASC, pi.id ASC`,
    [payrollRunId, employeeId]
  );
  return res.rows;
}

export async function insertPayrollItem(client, row) {
  const res = await client.query(
    `INSERT INTO payroll_item (
       id,
       payroll_run_id,
       employee_id,
       item_type,
       description,
       amount,
       division_id,
       is_system_generated,
       created_at,
       created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9)
     ON CONFLICT (payroll_run_id, employee_id, item_type, description) DO NOTHING
     RETURNING *`,
    [
      row.id,
      row.payroll_run_id,
      row.employee_id,
      row.item_type,
      row.description,
      row.amount,
      row.division_id,
      row.is_system_generated,
      row.created_by
    ]
  );
  return res.rows[0] || null;
}

export async function sumPayrollItemsByEmployee(client, { payrollRunId, employeeId }) {
  const res = await client.query(
    `SELECT
       COALESCE(SUM(CASE WHEN item_type IN ('BASE_PAY','ALLOWANCE','BONUS') THEN amount ELSE 0 END), 0)::numeric AS gross,
       COALESCE(SUM(CASE WHEN item_type IN ('DEDUCTION') THEN amount ELSE 0 END), 0)::numeric AS deductions,
       COALESCE(SUM(CASE WHEN item_type IN ('ADJUSTMENT') THEN amount ELSE 0 END), 0)::numeric AS adjustments
     FROM payroll_item
     WHERE payroll_run_id = $1 AND employee_id = $2`,
    [payrollRunId, employeeId]
  );
  return res.rows[0] || { gross: '0', deductions: '0', adjustments: '0' };
}

export async function listEmployeesWithPayrollItems(client, { payrollRunId, page, pageSize }) {
  const countRes = await client.query(
    `SELECT COUNT(DISTINCT employee_id)::int AS cnt
     FROM payroll_item
     WHERE payroll_run_id = $1`,
    [payrollRunId]
  );
  const total = countRes.rows[0]?.cnt || 0;
  const offset = (page - 1) * pageSize;

  const res = await client.query(
    `SELECT DISTINCT employee_id
     FROM payroll_item
     WHERE payroll_run_id = $1
     ORDER BY employee_id ASC
     LIMIT $2 OFFSET $3`,
    [payrollRunId, pageSize, offset]
  );

  return { employeeIds: res.rows.map((r) => r.employee_id), total };
}
