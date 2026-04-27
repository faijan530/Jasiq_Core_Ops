
const pg = require('pg');
const crypto = require('node:crypto');

async function run() {
  const pool = new pg.Pool({
    connectionString: 'postgresql://neondb_owner:npg_hp3bPl6YWyHC@ep-blue-block-aix617fj-pooler.c-4.us-east-1.aws.neon.tech/jasiq_core_ops?sslmode=require'
  });

  try {
    console.log('Synchronizing Superadmins to Employee table...');
    
    const admins = [
      { email: 'jasiqlabs@gmail.com', firstName: 'Super', lastName: 'Admin' },
      { email: 'support@jasiqlabs.com', firstName: 'Support', lastName: 'Admin' }
    ];

    for (const admin of admins) {
      const res = await pool.query('SELECT id FROM employee WHERE email = $1', [admin.email]);
      if (res.rowCount === 0) {
        console.log(`Creating employee for ${admin.email}...`);
        await pool.query(
          `INSERT INTO employee (id, employee_code, first_name, last_name, email, status, scope, primary_division_id, designation) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            crypto.randomUUID(),
            'ADM-' + Math.floor(Math.random() * 900 + 100),
            admin.firstName,
            admin.lastName,
            admin.email,
            'ACTIVE',
            'COMPANY',
            null,
            'SUPER_ADMIN'
          ]
        );
      } else {
        console.log(`Employee record for ${admin.email} already exists.`);
      }
    }

    console.log('Sync complete.');
  } catch (err) {
    console.error('Error during sync:', err);
  } finally {
    await pool.end();
  }
}

run();
