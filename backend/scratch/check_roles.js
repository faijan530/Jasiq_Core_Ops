import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function checkAdminRoles() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('--- ADMIN USERS ---');
    const users = await pool.query('SELECT id, email, role_name FROM admin_user');
    console.table(users.rows);

    console.log('--- ROLES ---');
    const roles = await pool.query('SELECT id, name FROM role');
    console.table(roles.rows);

    console.log('--- USER ROLES ---');
    const userRoles = await pool.query('SELECT user_id, role_id, scope FROM user_role');
    console.table(userRoles.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkAdminRoles();
