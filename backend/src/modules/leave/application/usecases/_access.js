import { forbidden } from '../../../../shared/kernel/errors.js';

export async function assertActorCanAccessEmployee(client, { actorId, permissionCode, employeeId }) {
  const resEmp = await client.query('SELECT primary_division_id FROM employee WHERE id = $1', [employeeId]);
  const divisionId = resEmp.rows[0]?.primary_division_id || null;

  const res = await client.query(
    `SELECT 1
     FROM user_role ur
     JOIN role_permission rp ON rp.role_id = ur.role_id
     JOIN permission p ON p.id = rp.permission_id
     WHERE ur.user_id = $1
       AND p.code = $2
       AND (
         ur.scope = 'COMPANY'
         OR (ur.scope = 'DIVISION' AND $3::uuid IS NOT NULL AND ur.division_id = $3)
       )
     LIMIT 1`,
    [actorId, permissionCode, divisionId]
  );

  if (res.rowCount === 0) throw forbidden();
}

export async function getEmployeeDivisionIdByLeaveRequestId(client, { leaveRequestId }) {
  const res = await client.query(
    `SELECT e.primary_division_id
     FROM leave_request lr
     JOIN employee e ON e.id = lr.employee_id
     WHERE lr.id = $1`,
    [leaveRequestId]
  );
  return res.rows[0]?.primary_division_id || null;
}

export async function getTodayDateOnly(client) {
  const res = await client.query(`SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS today_date`);
  return res.rows[0]?.today_date || null;
}
