import { Pool } from 'pg';

// Database connection - using the same connection as the backend
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_gpUcLdz2W4Hn@ep-quiet-lab-ai7hbksz-pooler.c-4.us-east-1.aws.neon.tech/jasiq_coreops?sslmode=verify-full'
});

async function addManagerAttendancePermission() {
  try {
    console.log('🔧 Adding ATTENDANCE_VIEW_TEAM permission to MANAGER role...');
    
    // Check if MANAGER role exists
    const managerRoleResult = await pool.query('SELECT id FROM role WHERE name = $1', ['MANAGER']);
    if (managerRoleResult.rows.length === 0) {
      console.log('❌ MANAGER role not found');
      return;
    }
    const managerRoleId = managerRoleResult.rows[0].id;
    console.log('✅ Found MANAGER role:', managerRoleId);
    
    // Check if ATTENDANCE_VIEW_TEAM permission exists
    const permissionResult = await pool.query('SELECT id FROM permission WHERE code = $1', ['ATTENDANCE_VIEW_TEAM']);
    if (permissionResult.rows.length === 0) {
      console.log('❌ ATTENDANCE_VIEW_TEAM permission not found');
      return;
    }
    const permissionId = permissionResult.rows[0].id;
    console.log('✅ Found ATTENDANCE_VIEW_TEAM permission:', permissionId);
    
    // Check if permission is already assigned
    const existingResult = await pool.query(
      'SELECT 1 FROM role_permission WHERE role_id = $1 AND permission_id = $2',
      [managerRoleId, permissionId]
    );
    
    if (existingResult.rows.length > 0) {
      console.log('ℹ️ Permission is already assigned to MANAGER role');
    } else {
      // Add the permission
      await pool.query(
        'INSERT INTO role_permission (role_id, permission_id) VALUES ($1, $2)',
        [managerRoleId, permissionId]
      );
      console.log('✅ Permission added successfully!');
    }
    
    // Final verification
    const verifyResult = await pool.query(`
      SELECT r.name as role_name, p.code as permission_code
      FROM role_permission rp
      JOIN role r ON rp.role_id = r.id
      JOIN permission p ON rp.permission_id = p.id
      WHERE r.name = 'MANAGER' AND p.code = 'ATTENDANCE_VIEW_TEAM'
    `);
    
    console.log('🎯 Final verification:', verifyResult.rows);
    
    if (verifyResult.rows.length > 0) {
      console.log('🎉 SUCCESS! MANAGER role now has ATTENDANCE_VIEW_TEAM permission!');
      console.log('🔄 Please refresh your browser to get the updated permissions.');
    } else {
      console.log('❌ Something went wrong - permission not found after assignment');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addManagerAttendancePermission();
