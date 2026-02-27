import { Pool } from 'pg';

// Database connection from .env
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_gpUcLdz2W4Hn@ep-quiet-lab-ai7hbksz-pooler.c-4.us-east-1.aws.neon.tech/jasiq_coreops?sslmode=verify-full'
});

async function fixConstraint() {
  console.log('Fixing leave_request status constraint...');
  
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // FIRST: Drop the old constraint to allow the updates
      console.log('Dropping old constraint first...');
      await client.query('ALTER TABLE leave_request DROP CONSTRAINT IF EXISTS leave_request_status_check');
      
      // THEN: Update existing SUBMITTED records to PENDING_L1
      console.log('Updating existing SUBMITTED records...');
      const updateResult = await client.query(
        'UPDATE leave_request SET status = $1 WHERE status = $2',
        ['PENDING_L1', 'SUBMITTED']
      );
      console.log(`Updated ${updateResult.rowCount} SUBMITTED records to PENDING_L1`);
      
      // FINALLY: Add the new constraint with updated status values
      console.log('Adding new constraint with updated status values...');
      await client.query(`
        ALTER TABLE leave_request 
        ADD CONSTRAINT leave_request_status_check 
        CHECK (status IN ('DRAFT','PENDING_L1','PENDING_L2','APPROVED','REJECTED','CANCELLED'))
      `);
      
      await client.query('COMMIT');
      console.log('✅ Constraint updated successfully!');
      
      // Verify the constraint (simplified for newer PostgreSQL versions)
      const constraintCheck = await client.query(`
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'leave_request'::regclass AND contype = 'c'
      `);
      console.log('Updated constraint name:', constraintCheck.rows[0]?.conname);
      console.log('✅ Leave request status constraint is now updated to support L1/L2 workflow!');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error updating constraint:', error);
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixConstraint();
