export async function getEmployeeIdByUserId(client, { userId }) {
  const res = await client.query('SELECT employee_id FROM "user" WHERE id = $1', [userId]);
  return res.rows[0]?.employee_id || null;
}

export async function getEmployeeById(client, { employeeId }) {
  const res = await client.query('SELECT * FROM employee WHERE id = $1', [employeeId]);
  return res.rows[0] || null;
}

export async function resolveEmployeeScopeForDate(client, { employeeId, claimDate }) {
  const res = await client.query(
    `SELECT scope, primary_division_id
     FROM employee_scope_history
     WHERE employee_id = $1
       AND effective_from <= $2
       AND (effective_to IS NULL OR effective_to > $2)
     ORDER BY effective_from DESC
     LIMIT 1`,
    [employeeId, claimDate]
  );

  return {
    scope: res.rows[0]?.scope || null,
    divisionId: res.rows[0]?.primary_division_id || null
  };
}

export async function insertReimbursement(client, row) {
  const res = await client.query(
    `INSERT INTO reimbursement (
      id,
      employee_id,
      claim_date,
      claim_month,
      title,
      description,
      total_amount,
      scope,
      division_id,
      status,
      decision_reason,
      approved_at,
      approved_by,
      rejected_at,
      rejected_by,
      paid_amount,
      due_amount,
      linked_expense_id,
      submitted_at,
      submitted_by,
      created_at,
      created_by,
      updated_at,
      updated_by,
      version
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
      NOW(),$21,NOW(),$21,$22
    )
    RETURNING *`,
    [
      row.id,
      row.employee_id,
      row.claim_date,
      row.claim_month,
      row.title,
      row.description,
      row.total_amount,
      row.scope,
      row.division_id,
      row.status,
      row.decision_reason,
      row.approved_at,
      row.approved_by,
      row.rejected_at,
      row.rejected_by,
      row.paid_amount,
      row.due_amount,
      row.linked_expense_id,
      row.submitted_at,
      row.submitted_by,
      row.actor_id,
      row.version
    ]
  );
  return res.rows[0];
}

export async function getReimbursementById(client, { id, forUpdate }) {
  const res = await client.query(
    `SELECT *
     FROM reimbursement
     WHERE id = $1
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [id]
  );
  return res.rows[0] || null;
}

export async function getDivisionIdForReimbursement(client, { id }) {
  const res = await client.query('SELECT division_id FROM reimbursement WHERE id = $1', [id]);
  return res.rows[0]?.division_id || null;
}

export async function countActiveReceipts(client, { reimbursementId }) {
  const res = await client.query(
    `SELECT COUNT(*)::int AS c
     FROM reimbursement_receipt
     WHERE reimbursement_id = $1 AND is_active = true`,
    [reimbursementId]
  );
  return res.rows[0]?.c || 0;
}

export async function updateReimbursementDraft(client, { id, patch, actorId, expectedVersion }) {
  const keys = Object.keys(patch || {});
  if (keys.length === 0) return null;

  const sets = [];
  const values = [id];
  let idx = 2;

  for (const k of keys) {
    sets.push(`${k} = $${idx}`);
    values.push(patch[k]);
    idx += 1;
  }

  values.push(actorId);
  const updatedByIdx = idx;
  idx += 1;

  values.push(expectedVersion);
  const versionIdx = idx;

  const res = await client.query(
    `UPDATE reimbursement
     SET ${sets.join(', ')},
         updated_at = NOW(),
         updated_by = $${updatedByIdx},
         version = version + 1
     WHERE id = $1
       AND version = $${versionIdx}
       AND status = 'DRAFT'
     RETURNING *`,
    values
  );

  return res.rows[0] || null;
}

export async function updateReimbursementStatus(client, {
  id,
  toStatus,
  decisionReason,
  approvedAt,
  approvedBy,
  rejectedAt,
  rejectedBy,
  submittedAt,
  submittedBy,
  paidAmount,
  dueAmount,
  linkedExpenseId,
  actorId,
  expectedVersion
}) {
  const res = await client.query(
    `UPDATE reimbursement
     SET status = $2,
         decision_reason = COALESCE($3, decision_reason),
         approved_at = COALESCE($4, approved_at),
         approved_by = COALESCE($5, approved_by),
         rejected_at = COALESCE($6, rejected_at),
         rejected_by = COALESCE($7, rejected_by),
         submitted_at = COALESCE($8, submitted_at),
         submitted_by = COALESCE($9, submitted_by),
         paid_amount = COALESCE($10, paid_amount),
         due_amount = COALESCE($11, due_amount),
         linked_expense_id = COALESCE($12, linked_expense_id),
         updated_at = NOW(),
         updated_by = $13,
         version = version + 1
     WHERE id = $1
       AND version = $14
     RETURNING *`,
    [
      id,
      toStatus,
      decisionReason ?? null,
      approvedAt ?? null,
      approvedBy ?? null,
      rejectedAt ?? null,
      rejectedBy ?? null,
      submittedAt ?? null,
      submittedBy ?? null,
      paidAmount ?? null,
      dueAmount ?? null,
      linkedExpenseId ?? null,
      actorId,
      expectedVersion
    ]
  );
  return res.rows[0] || null;
}

export async function updateReimbursementPaymentTotals(client, { id, paidAmount, dueAmount, status, actorId, expectedVersion }) {
  const res = await client.query(
    `UPDATE reimbursement
     SET paid_amount = $2,
         due_amount = $3,
         status = $4,
         updated_at = NOW(),
         updated_by = $5,
         version = version + 1
     WHERE id = $1
       AND version = $6
     RETURNING *`,
    [id, paidAmount, dueAmount, status, actorId, expectedVersion]
  );
  return res.rows[0] || null;
}

export async function countReimbursements(client, { employeeId, divisionId, status, claimMonth }) {
  const res = await client.query(
    `SELECT COUNT(*)::int AS c
     FROM reimbursement
     WHERE ($1::uuid IS NULL OR employee_id = $1)
       AND ($2::uuid IS NULL OR division_id = $2)
       AND ($3::text IS NULL OR status = $3)
       AND ($4::date IS NULL OR claim_month = $4::date)`,
    [employeeId || null, divisionId || null, status || null, claimMonth || null]
  );
  return res.rows[0].c;
}

export async function listReimbursements(client, { employeeId, divisionId, status, claimMonth, offset, limit }) {
  const res = await client.query(
    `SELECT
       r.*, 
       (e.first_name || ' ' || e.last_name)::text AS employee_name,
       (
         SELECT COUNT(*)::int
         FROM reimbursement_receipt rr
         WHERE rr.reimbursement_id = r.id
           AND rr.is_active = true
       ) AS receipt_count
     FROM reimbursement r
     JOIN employee e ON e.id = r.employee_id
     WHERE ($1::uuid IS NULL OR r.employee_id = $1)
       AND ($2::uuid IS NULL OR r.division_id = $2)
       AND ($3::text IS NULL OR r.status = $3)
       AND ($6::date IS NULL OR r.claim_month = $6::date)
     ORDER BY r.created_at DESC, r.id DESC
     OFFSET $4 LIMIT $5`,
    [employeeId || null, divisionId || null, status || null, offset, limit, claimMonth || null]
  );
  return res.rows;
}
