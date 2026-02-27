import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_gpUcLdz2W4Hn@ep-quiet-lab-ai7hbksz-pooler.c-4.us-east-1.aws.neon.tech/jasiq_coreops?sslmode=verify-full'
});

async function createAndAssignPermission() {
  try {
    console.log('🔧 Creating ATTENDANCE_VIEW_TEAM permission and assigning to MANAGER role...');
    
    // Step 1: Create the ATTENDANCE_VIEW_TEAM permission
    console.log('📝 Creating ATTENDANCE_VIEW_TEAM permission...');
    const createResult = await pool.query(`
      INSERT INTO permission (id, code, description)
      SELECT gen_random_uuid(), 'ATTENDANCE_VIEW_TEAM', 'Allows viewing attendance records of team members'
      WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'ATTENDANCE_VIEW_TEAM')
      RETURNING id
    `);
    
    if (createResult.rows.length > 0) {
      console.log('✅ Created ATTENDANCE_VIEW_TEAM permission:', createResult.rows[0].id);
    } else {
      console.log('ℹ️ ATTENDANCE_VIEW_TEAM permission already exists');
    }
    
    // Step 2: Get the permission ID
    const permissionResult = await pool.query('SELECT id FROM permission WHERE code = $1', ['ATTENDANCE_VIEW_TEAM']);
    if (permissionResult.rows.length === 0) {
      console.log('❌ Could not find ATTENDANCE_VIEW_TEAM permission after creation');
      return;
    }
    const permissionId = permissionResult.rows[0].id;
    
    // Step 3: Get MANAGER role ID
    const managerResult = await pool.query('SELECT id FROM role WHERE name = $1', ['MANAGER']);
    if (managerResult.rows.length === 0) {
      console.log('❌ MANAGER role not found');
      return;
    }
    const managerRoleId = managerResult.rows[0].id;
    
    // Step 4: Assign permission to MANAGER role
    console.log('🔗 Assigning permission to MANAGER role...');
    const existingResult = await pool.query(
      'SELECT 1 FROM role_permission WHERE role_id = $1 AND permission_id = $2',
      [managerRoleId, permissionId]
    );
    
    if (existingResult.rows.length === 0) {
      await pool.query(
        'INSERT INTO role_permission (role_id, permission_id) VALUES ($1, $2)',
        [managerRoleId, permissionId]
      );
      console.log('✅ Permission assigned to MANAGER role!');
    } else {
      console.log('ℹ️ Permission was already assigned to MANAGER role');
    }
    
    // Step 5: Final verification
    const verifyResult = await pool.query(`
      SELECT r.name as role_name, p.code as permission_code, p.description as permission_description
      FROM role_permission rp
      JOIN role r ON rp.role_id = r.id
      JOIN permission p ON rp.permission_id = p.id
      WHERE r.name = 'MANAGER' AND p.code = 'ATTENDANCE_VIEW_TEAM'
    `);
    
    console.log('🎯 Final verification:', verifyResult.rows);
    
    if (verifyResult.rows.length > 0) {
      console.log('🎉 SUCCESS! MANAGER role now has ATTENDANCE_VIEW_TEAM permission!');
      console.log('🔄 Please refresh your browser to get the updated permissions.');
      console.log('📱 You should now be able to access the Team Attendance page!');
    } else {
      console.log('❌ Something went wrong');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAndAssignPermission();
