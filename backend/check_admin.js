import { createPool } from './src/shared/persistence/db.js';

async function checkAdmin() {
  const pool = createPool();
  
  try {
    const result = await pool.query(`
      SELECT 
        au.id, 
        au.email, 
        au.role_name as admin_role,
        ur.role_id,
        r.name as mapped_role
      FROM admin_user au 
      LEFT JOIN user_role ur ON ur.user_id = au.id 
      LEFT JOIN role r ON r.id = ur.role_id 
      WHERE au.email = 'kfizz4255@gmail.com'
    `);
    
    console.log('Admin user check:');
    console.table(result.rows);
    
    // Check if SUPER_ADMIN role exists
    const roleCheck = await pool.query(`
      SELECT id, name FROM role WHERE name = 'SUPER_ADMIN'
    `);
    
    console.log('\nSUPER_ADMIN role check:');
    console.table(roleCheck.rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAdmin();
