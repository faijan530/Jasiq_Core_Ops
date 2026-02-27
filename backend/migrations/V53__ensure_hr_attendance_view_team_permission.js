'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Ensure HR_ADMIN has ATTENDANCE_VIEW_TEAM permission
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Get HR_ADMIN role ID
      const [roleResult] = await queryInterface.sequelize.query(`
        SELECT id FROM role WHERE name = 'HR_ADMIN'
      `, { transaction });

      if (roleResult.length === 0) {
        throw new Error('HR_ADMIN role not found');
      }

      const roleId = roleResult[0].id;

      // Get ATTENDANCE_VIEW_TEAM permission ID
      const [permissionResult] = await queryInterface.sequelize.query(`
        SELECT id FROM permission WHERE code = 'ATTENDANCE_VIEW_TEAM'
      `, { transaction });

      if (permissionResult.length === 0) {
        throw new Error('ATTENDANCE_VIEW_TEAM permission not found');
      }

      const permissionId = permissionResult[0].id;

      // Check if permission is already assigned
      const [existingResult] = await queryInterface.sequelize.query(`
        SELECT 1 FROM role_permission 
        WHERE role_id = $1 AND permission_id = $2
      `, {
        bind: [roleId, permissionId],
        transaction
      });

      if (existingResult.length === 0) {
        // Assign permission to HR_ADMIN
        await queryInterface.sequelize.query(`
          INSERT INTO role_permission (role_id, permission_id, created_at, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, {
          bind: [roleId, permissionId],
          transaction
        });

        console.log('Assigned ATTENDANCE_VIEW_TEAM permission to HR_ADMIN role');
      } else {
        console.log('ATTENDANCE_VIEW_TEAM permission already assigned to HR_ADMIN role');
      }
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove ATTENDANCE_VIEW_TEAM permission from HR_ADMIN (if it was added by this migration)
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [roleResult] = await queryInterface.sequelize.query(`
        SELECT id FROM role WHERE name = 'HR_ADMIN'
      `, { transaction });

      if (roleResult.length === 0) return;

      const roleId = roleResult[0].id;

      const [permissionResult] = await queryInterface.sequelize.query(`
        SELECT id FROM permission WHERE code = 'ATTENDANCE_VIEW_TEAM'
      `, { transaction });

      if (permissionResult.length === 0) return;

      const permissionId = permissionResult[0].id;

      await queryInterface.sequelize.query(`
        DELETE FROM role_permission 
        WHERE role_id = $1 AND permission_id = $2
      `, {
        bind: [roleId, permissionId],
        transaction
      });

      console.log('Removed ATTENDANCE_VIEW_TEAM permission from HR_ADMIN role');
    });
  }
};
