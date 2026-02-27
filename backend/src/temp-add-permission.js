import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function addManagerAttendancePermission(req, res) {
  try {
    console.log('Adding ATTENDANCE_VIEW_TEAM permission to MANAGER role...');
    
    const result = await pool.query(`
      DO $$
      DECLARE
          manager_role_id UUID;
          permission_id UUID;
          existing_count INTEGER;
      BEGIN
          -- Get MANAGER role ID
          SELECT id INTO manager_role_id FROM role WHERE name = 'MANAGER';
          
          IF manager_role_id IS NULL THEN
              RAISE EXCEPTION 'MANAGER role not found';
          END IF;
          
          -- Get ATTENDANCE_VIEW_TEAM permission ID
          SELECT id INTO permission_id FROM permission WHERE code = 'ATTENDANCE_VIEW_TEAM';
          
          IF permission_id IS NULL THEN
              RAISE EXCEPTION 'ATTENDANCE_VIEW_TEAM permission not found';
          END IF;
          
          -- Check if permission is already assigned
          SELECT COUNT(*) INTO existing_count 
          FROM role_permission 
          WHERE role_id = manager_role_id AND permission_id = permission_id;
          
          -- Add permission if not already assigned
          IF existing_count = 0 THEN
              INSERT INTO role_permission (role_id, permission_id, created_at, updated_at)
              VALUES (manager_role_id, permission_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
              
              RAISE NOTICE 'Successfully added ATTENDANCE_VIEW_TEAM permission to MANAGER role';
          ELSE
              RAISE NOTICE 'MANAGER already has ATTENDANCE_VIEW_TEAM permission';
          END IF;
      END $$;
    `);
    
    // Verify the permission was added
    const verifyResult = await pool.query(`
      SELECT r.name as role_name, p.code as permission_code
      FROM role_permission rp
      JOIN role r ON rp.role_id = r.id
      JOIN permission p ON rp.permission_id = p.id
      WHERE r.name = 'MANAGER' AND p.code = 'ATTENDANCE_VIEW_TEAM'
    `);
    
    console.log('✅ Permission added successfully!');
    console.log('Verification:', verifyResult.rows);
    
    res.json({ 
      success: true, 
      message: 'ATTENDANCE_VIEW_TEAM permission added to MANAGER role',
      verification: verifyResult.rows
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
