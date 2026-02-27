export async function insertExpenseCategory(client, row) {
  const res = await client.query(
    `INSERT INTO expense_category (
       id, code, name, description,
       is_active,
       created_at, created_by,
       updated_at, updated_by,
       version
     ) VALUES ($1,$2,$3,$4,true,NOW(),$5,NOW(),$5,$6)
     RETURNING *`,
    [row.id, row.code, row.name, row.description, row.created_by, row.version]
  );
  return res.rows[0];
}

export async function getExpenseCategoryById(client, { id }) {
  const res = await client.query('SELECT * FROM expense_category WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function getExpenseCategoryByCode(client, { code }) {
  const res = await client.query('SELECT * FROM expense_category WHERE code = $1', [code]);
  return res.rows[0] || null;
}

export async function updateExpenseCategory(client, { id, patch, actorId, expectedVersion }) {
  const res = await client.query(
    `UPDATE expense_category
     SET
       code = COALESCE($2, code),
       name = COALESCE($3, name),
       description = COALESCE($4, description),
       is_active = COALESCE($5, is_active),
       updated_at = NOW(),
       updated_by = $6,
       version = version + 1
     WHERE id = $1 AND version = $7
     RETURNING *`,
    [
      id,
      patch.code ?? null,
      patch.name ?? null,
      patch.description ?? null,
      patch.is_active ?? null,
      actorId,
      expectedVersion
    ]
  );
  return res.rows[0] || null;
}

export async function listActiveExpenseCategories(client) {
  const res = await client.query(
    `SELECT *
     FROM expense_category
     WHERE is_active = true
     ORDER BY code ASC`
  );
  return res.rows;
}
