import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function fixRole() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const userRes = await pool.query('SELECT id FROM admin_user WHERE email = $1', ['admin@coreops.dev']);
    if (userRes.rowCount === 0) {
      console.error('Admin user not found');
      return;
    }
    const userId = userRes.rows[0].id;

    const roleRes = await pool.query('SELECT id FROM role WHERE name = $1', ['COREOPS_ADMIN']);
    if (roleRes.rowCount === 0) {
      console.error('Role not found');
      return;
    }
    const roleId = roleRes.rows[0].id;

    await pool.query(
      `INSERT INTO user_role (id, user_id, role_id, scope, division_id) 
       VALUES (gen_random_uuid(), $1, $2, 'COMPANY', NULL) 
       ON CONFLICT DO NOTHING`,
      [userId, roleId]
    );

    console.log('✅ Role mapping fixed for admin@coreops.dev');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

fixRole();
