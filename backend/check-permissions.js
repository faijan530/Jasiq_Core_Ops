import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_gpUcLdz2W4Hn@ep-quiet-lab-ai7hbksz-pooler.c-4.us-east-1.aws.neon.tech/jasiq_coreops?sslmode=verify-full'
});

async function checkPermissions() {
  try {
    const result = await pool.query("SELECT code FROM permission WHERE code LIKE '%ATTENDANCE%'");
    console.log('Available attendance permissions:');
    result.rows.forEach(row => console.log('  -', row.code));
    
    const allPerms = await pool.query('SELECT code FROM permission ORDER BY code LIMIT 30');
    console.log('\nAll permissions (first 30):');
    allPerms.rows.forEach(row => console.log('  -', row.code));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPermissions();
