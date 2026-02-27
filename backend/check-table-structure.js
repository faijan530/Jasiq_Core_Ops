import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_gpUcLdz2W4Hn@ep-quiet-lab-ai7hbksz-pooler.c-4.us-east-1.aws.neon.tech/jasiq_coreops?sslmode=verify-full'
});

async function checkTableStructure() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'permission' 
      ORDER BY ordinal_position
    `);
    
    console.log('Permission table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    // Check a sample permission
    const sampleResult = await pool.query('SELECT * FROM permission LIMIT 1');
    console.log('\nSample permission:', sampleResult.rows[0]);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure();
