import crypto from 'node:crypto';

import { badRequest } from '../../../shared/kernel/errors.js';

export async function createApprovedExpenseFromReimbursement(client, {
  reimbursement,
  actorId
}) {
  const resCat = await client.query('SELECT id FROM expense_category WHERE code = $1 AND is_active = true LIMIT 1', [
    'REIMBURSEMENT'
  ]);
  const categoryId = resCat.rows[0]?.id;
  if (!categoryId) throw badRequest('Missing expense category for reimbursement');

  const expId = crypto.randomUUID();

  const insert = await client.query(
    `INSERT INTO expense (
      id,
      expense_date,
      category_id,
      title,
      description,
      amount,
      currency,
      division_id,
      project_id,
      paid_by_method,
      vendor_name,
      is_reimbursement,
      employee_id,
      status,
      submitted_at,
      submitted_by,
      approved_at,
      approved_by,
      rejected_at,
      rejected_by,
      decision_reason,
      created_at,
      created_by,
      updated_at,
      updated_by,
      version
    ) VALUES (
      $1,$2,$3,$4,$5,$6,'INR',$7,NULL,'OTHER',NULL,true,$8,'APPROVED',
      NOW(),$9,NOW(),$9,NULL,NULL,NULL,
      NOW(),$9,NOW(),$9,1
    )
    RETURNING id`,
    [
      expId,
      String(reimbursement.claim_date).slice(0, 10),
      categoryId,
      String(reimbursement.title || '').slice(0, 200),
      reimbursement.description ? String(reimbursement.description) : null,
      reimbursement.total_amount,
      reimbursement.division_id || null,
      reimbursement.employee_id,
      actorId
    ]
  );

  return insert.rows[0]?.id || expId;
}
