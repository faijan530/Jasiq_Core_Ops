import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_gpUcLdz2W4Hn@ep-quiet-lab-ai7hbksz-pooler.c-4.us-east-1.aws.neon.tech/jasiq_coreops?sslmode=verify-full'
});

async function checkAllPermissions() {
  try {
    const result = await pool.query('SELECT code FROM permission ORDER BY code');
    console.log('All permissions:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.code}`);
    });
    
    // Check for any TEAM permissions
    const teamPerms = await pool.query("SELECT code FROM permission WHERE code LIKE '%TEAM%'");
    console.log('\nTeam permissions:');
    teamPerms.rows.forEach(row => console.log('  -', row.code));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAllPermissions();
