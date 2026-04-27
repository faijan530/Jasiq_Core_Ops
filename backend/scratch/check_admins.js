import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function checkAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000
  });

  try {
    console.log('Attempting to connect to database...');
    const res = await pool.query('SELECT email, role_name, is_active FROM admin_user');
    console.log('Connection successful!');
    console.log('Admins in DB:', res.rows);
  } catch (err) {
    console.error('Error checking admins:', err.message);
    if (err.cause) console.error('Cause:', err.cause.message);
  } finally {
    await pool.end();
  }
}

checkAdmin();
