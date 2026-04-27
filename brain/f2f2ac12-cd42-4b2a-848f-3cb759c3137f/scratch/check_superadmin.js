
import pg from 'pg';
const { Pool } = pg;

async function run() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres@localhost:5432/jasiq'
  });

  try {
    const res = await pool.query(`
      SELECT e.id, e.first_name, e.last_name, e.status, e.primary_division_id, r.name as role
      FROM employee e
      LEFT JOIN "user" u ON u.employee_id = e.id
      LEFT JOIN user_role ur ON ur.user_id = u.id
      LEFT JOIN role r ON r.id = ur.role_id
      WHERE r.name = 'SUPER_ADMIN' OR e.last_name ILIKE '%Admin%' OR e.first_name ILIKE '%Admin%'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
