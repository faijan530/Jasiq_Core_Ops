export async function getEmployeeById(client, id) {
  const res = await client.query(
    `SELECT e.*, 
            CONCAT(m.first_name, ' ', m.last_name) AS reporting_manager_name
     FROM employee e
     LEFT JOIN employee m ON e.reporting_manager_id = m.id
     WHERE e.id = $1`, 
    [id]
  );
  return res.rows[0] || null;
}

export async function getEmployeeByCode(client, employeeCode) {
  const res = await client.query('SELECT * FROM employee WHERE employee_code = $1', [employeeCode]);
  return res.rows[0] || null;
}

export async function getEmployeeByIdempotencyKey(client, idempotencyKey) {
  const res = await client.query('SELECT * FROM employee WHERE idempotency_key = $1', [idempotencyKey]);
  return res.rows[0] || null;
}

export async function countEmployees(client, { divisionId, scope, status }) {
  const res = await client.query(
    `SELECT COUNT(*)::int AS c
     FROM employee
     WHERE ($1::uuid IS NULL OR primary_division_id = $1)
       AND ($2::text IS NULL OR scope = $2)
       AND ($3::text IS NULL OR status = $3)`,
    [divisionId || null, scope || null, status || null]
  );
  return res.rows[0].c;
}

export async function listEmployees(client, { divisionId, scope, status, offset, limit }) {
  const res = await client.query(
    `SELECT e.*,
            COALESCE(c.frequency, NULL) AS compensation_type,
            COALESCE(c.amount, NULL) AS compensation_amount
     FROM employee e
     LEFT JOIN employee_compensation_version c
       ON e.id = c.employee_id AND c.effective_to IS NULL
     WHERE ($1::uuid IS NULL OR e.primary_division_id = $1)
       AND ($2::text IS NULL OR e.scope = $2)
       AND ($3::text IS NULL OR e.status = $3)
     ORDER BY e.employee_code ASC
     OFFSET $4 LIMIT $5`,
    [divisionId || null, scope || null, status || null, offset, limit]
  );
  return res.rows;
}

export async function insertEmployee(client, row) {
  await client.query(
    `INSERT INTO employee (
      id, employee_code, first_name, last_name, designation, email, phone,
      status, scope, primary_division_id, reporting_manager_id, idempotency_key,
      created_at, created_by, updated_at, updated_by, version
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      row.id,
      row.employee_code,
      row.first_name,
      row.last_name,
      row.designation,
      row.email,
      row.phone,
      row.status,
      row.scope,
      row.primary_division_id,
      row.reporting_manager_id,
      row.idempotency_key,
      row.created_at,
      row.created_by,
      row.updated_at,
      row.updated_by,
      row.version
    ]
  );
}

export async function updateEmployeeProfile(client, { id, firstName, lastName, email, phone, actorId }) {
  const res = await client.query(
    `UPDATE employee
     SET first_name = COALESCE($2, first_name),
         last_name = COALESCE($3, last_name),
         email = COALESCE($4, email),
         phone = COALESCE($5, phone),
         updated_at = NOW(),
         updated_by = $6,
         version = version + 1
     WHERE id = $1
     RETURNING *`,
    [id, firstName ?? null, lastName ?? null, email ?? null, phone ?? null, actorId]
  );
  return res.rows[0] || null;
}

export async function updateEmployeeScope(client, { id, scope, primaryDivisionId, actorId }) {
  const res = await client.query(
    `UPDATE employee
     SET scope = $2,
         primary_division_id = $3,
         updated_at = NOW(),
         updated_by = $4,
         version = version + 1
     WHERE id = $1
     RETURNING *`,
    [id, scope, primaryDivisionId || null, actorId]
  );
  return res.rows[0] || null;
}

export async function getEligibleReportingManagers(client, { divisionId }) {
  let divisionUuid = null;
  
  // If divisionId is provided, validate and convert
  if (divisionId) {
    // Check if it's already a UUID
    if (divisionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      divisionUuid = divisionId;
    } else {
      // Look up by code
      const divisionRes = await client.query(
        'SELECT id FROM division WHERE code = $1 AND is_active = true',
        [divisionId]
      );
      
      if (divisionRes.rows.length === 0) {
        throw new Error(`Division with code '${divisionId}' not found or inactive`);
      }
      
      divisionUuid = divisionRes.rows[0].id;
    }
  }
  
  const res = await client.query(
    `SELECT id, first_name, last_name, designation
     FROM employee
     WHERE status = 'ACTIVE'
       AND ($1::uuid IS NULL OR primary_division_id = $1)
     ORDER BY first_name ASC, last_name ASC`,
    [divisionUuid]
  );
  return res.rows;
}

export async function updateEmployeeStatus(client, { id, status, actorId }) {
  const res = await client.query(
    `UPDATE employee
     SET status = $2,
         updated_at = NOW(),
         updated_by = $3,
         version = version + 1
     WHERE id = $1
     RETURNING *`,
    [id, status, actorId]
  );
  return res.rows[0] || null;
}

export async function getActiveEmployeeScopeHistory(client, employeeId) {
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

export async function listEmployeeScopeHistory(client, employeeId) {
  const res = await client.query(
    `SELECT *
     FROM employee_scope_history
     WHERE employee_id = $1
     ORDER BY effective_from DESC, changed_at DESC`,
    [employeeId]
  );
  return res.rows;
}

export async function listEmployeeCompensationVersions(client, employeeId) {
  const res = await client.query(
    `SELECT *
     FROM employee_compensation_version
     WHERE employee_id = $1
     ORDER BY effective_from DESC, created_at DESC`,
    [employeeId]
  );
  return res.rows;
}

export async function getActiveEmployeeCompensationVersion(client, employeeId) {
  const res = await client.query(
    `SELECT *
     FROM employee_compensation_version
     WHERE employee_id = $1 AND effective_to IS NULL
     ORDER BY effective_from DESC
     LIMIT 1`,
    [employeeId]
  );
  return res.rows[0] || null;
}

export async function closeActiveEmployeeCompensationVersion(client, { employeeId, effectiveTo }) {
  await client.query(
    `UPDATE employee_compensation_version
     SET effective_to = $2
     WHERE employee_id = $1 AND effective_to IS NULL`,
    [employeeId, effectiveTo]
  );
}

export async function getUserIdByEmployeeId(client, employeeId) {
  const res = await client.query('SELECT id FROM "user" WHERE employee_id = $1', [employeeId]);
  return res.rows[0]?.id || null;
}

export async function listRoleIdsByNames(client, roleNames) {
  const names = Array.isArray(roleNames) ? roleNames.map((x) => String(x)) : [];
  if (names.length === 0) return [];

  const res = await client.query(
    `SELECT id, name
     FROM role
     WHERE name = ANY($1::text[])`,
    [names]
  );

  return res.rows;
}

export async function listUserRoleNames(client, userId) {
  const res = await client.query(
    `SELECT r.name
     FROM user_role ur
     JOIN role r ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );

  return res.rows.map((r) => r.name);
}

export async function replaceUserFunctionalCompanyRoles(client, { userId, functionalRoleNames }) {
  const desired = Array.isArray(functionalRoleNames)
    ? functionalRoleNames.map((x) => String(x))
    : [];

  const functionalNames = ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'FINANCE_ADMIN'];
  const functionalRoleRows = await listRoleIdsByNames(client, functionalNames);
  const functionalRoleIds = functionalRoleRows.map((r) => r.id);

  await client.query(
    `DELETE FROM user_role
     WHERE user_id = $1
       AND scope = 'COMPANY'
       AND division_id IS NULL
       AND role_id = ANY($2::uuid[])`,
    [userId, functionalRoleIds]
  );

  const desiredRows = await listRoleIdsByNames(client, desired);
  const desiredIds = desiredRows.map((r) => r.id);

  for (const roleId of desiredIds) {
    await client.query(
      `INSERT INTO user_role (id, user_id, role_id, scope, division_id)
       VALUES (gen_random_uuid(), $1, $2, 'COMPANY', NULL)
       ON CONFLICT DO NOTHING`,
      [userId, roleId]
    );
  }
}

export async function insertEmployeeCompensationVersion(client, row) {
  await client.query(
    `INSERT INTO employee_compensation_version (
      id, employee_id, amount, currency, frequency,
      effective_from, effective_to, reason,
      created_at, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      row.id,
      row.employee_id,
      row.amount,
      row.currency,
      row.frequency,
      row.effective_from,
      row.effective_to,
      row.reason,
      row.created_at,
      row.created_by
    ]
  );
}

export async function listEmployeeDocuments(client, employeeId) {
  const res = await client.query(
    `SELECT *
     FROM employee_document
     WHERE employee_id = $1
     ORDER BY uploaded_at DESC`,
    [employeeId]
  );
  return res.rows;
}

export async function getEmployeeDocumentById(client, { employeeId, docId }) {
  const res = await client.query(
    'SELECT * FROM employee_document WHERE employee_id = $1 AND id = $2',
    [employeeId, docId]
  );
  return res.rows[0] || null;
}

export async function insertEmployeeDocument(client, row) {
  await client.query(
    `INSERT INTO employee_document (
      id, employee_id, document_type, file_name, storage_key,
      mime_type, size_bytes,
      is_active, uploaded_at, uploaded_by,
      deactivated_at, deactivated_by, deactivated_reason
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      row.id,
      row.employee_id,
      row.document_type,
      row.file_name,
      row.storage_key,
      row.mime_type,
      row.size_bytes,
      row.is_active,
      row.uploaded_at,
      row.uploaded_by,
      row.deactivated_at,
      row.deactivated_by,
      row.deactivated_reason
    ]
  );
}

export async function findUserByPasswordSetupToken(client, token) {
  const res = await client.query(
    'SELECT * FROM "user" WHERE password_setup_token = $1',
    [token]
  );
  return res.rows[0] || null;
}

export async function findByPasswordSetupToken(client, token) {
  return await findUserByPasswordSetupToken(client, token);
}

export async function getUserByEmail(client, email) {
  const res = await client.query('SELECT * FROM "user" WHERE email = $1', [String(email || '').trim().toLowerCase()]);
  return res.rows[0] || null;
}

export async function getUserByEmployeeId(client, employeeId) {
  const res = await client.query('SELECT * FROM "user" WHERE employee_id = $1', [employeeId]);
  return res.rows[0] || null;
}

export async function insertEmployeeUserAccount(client, row) {
  const res = await client.query(
    `INSERT INTO "user" (
       id,
       email,
       password,
       role,
       active,
       employee_id,
       password_setup_token,
       password_setup_expiry,
       account_activated,
       must_change_password,
       created_at,
       updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
     ON CONFLICT (email) DO NOTHING
     RETURNING *`,
    [
      row.id,
      row.email,
      row.password,
      row.role,
      row.active,
      row.employee_id,
      row.password_setup_token,
      row.password_setup_expiry,
      row.account_activated
      ,
      row.must_change_password ?? true
    ]
  );
  return res.rows[0] || null;
}

export async function activateUserPassword(client, { userId, passwordHash }) {
  const res = await client.query(
    `UPDATE "user"
     SET password = $2,
         password_setup_token = NULL,
         password_setup_expiry = NULL,
         account_activated = TRUE,
         active = TRUE,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId, passwordHash]
  );
  return res.rows[0] || null;
}

export async function ensureEmployeeUserRole(client, { userId }) {
  const res = await client.query('SELECT id FROM role WHERE name = $1', ['EMPLOYEE']);
  const roleId = res.rows[0]?.id || null;
  if (!roleId) return;

  await client.query(
    `INSERT INTO user_role (id, user_id, role_id, scope, division_id)
     VALUES (gen_random_uuid(), $1, $2, 'COMPANY', NULL)
     ON CONFLICT DO NOTHING`,
    [userId, roleId]
  );
}

export async function getRoleByName(client, roleName) {
  const res = await client.query('SELECT id FROM role WHERE name = $1', [roleName]);
  if (res.rows.length === 0) {
    throw new Error(`Role "${roleName}" not found`);
  }
  return res.rows[0].id;
}

export async function assignUserRole(client, { userId, roleName }) {
  const roleId = await getRoleByName(client, roleName);
  
  await client.query(
    `INSERT INTO user_role (id, user_id, role_id, scope, division_id)
     VALUES (gen_random_uuid(), $1, $2, 'COMPANY', NULL)
     ON CONFLICT (user_id, role_id) DO UPDATE SET
       role_id = EXCLUDED.role_id,
       scope = EXCLUDED.scope,
       division_id = EXCLUDED.division_id`,
    [userId, roleId]
  );
}
