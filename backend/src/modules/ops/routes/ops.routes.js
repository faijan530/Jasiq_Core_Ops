import { Router } from 'express';

import { requirePermission } from '../../../shared/kernel/authorization.js';

import { opsInboxController } from '../controllers/opsInbox.controller.js';
import { alertsController } from '../controllers/alerts.controller.js';
import { overridesController } from '../controllers/overrides.controller.js';
import { dataQualityController } from '../controllers/dataQuality.controller.js';
import { opsDashboardController } from '../controllers/opsDashboard.controller.js';

export function opsRoutes({ pool }) {
  const router = Router();

  async function inferDivisionIdFromUserRole(req) {
    try {
      if (req.query?.divisionId) return String(req.query.divisionId);
      const userId = req.auth?.userId;
      if (!userId) return null;

      const res = await pool.query(
        `SELECT ur.division_id
         FROM user_role ur
         WHERE ur.user_id = $1
           AND ur.scope = 'DIVISION'
           AND ur.division_id IS NOT NULL
         ORDER BY ur.division_id ASC
         LIMIT 1`,
        [userId]
      );

      return res.rows[0]?.division_id || null;
    } catch {
      return null;
    }
  }

  const inbox = opsInboxController({ pool });
  const alerts = alertsController({ pool });
  const overrides = overridesController({ pool });
  const dq = dataQualityController({ pool });
  const dash = opsDashboardController({ pool });

  router.get(
    '/inbox',
    async (req, res, next) => {
      const inferred = await inferDivisionIdFromUserRole(req);
      if (inferred && !req.query?.divisionId) {
        req.query.divisionId = inferred;
      }
      next();
    },
    requirePermission({
      pool,
      permissionCode: 'OPS_INBOX_READ',
      getDivisionId: async (req) => (req.query?.divisionId ? String(req.query.divisionId) : null)
    }),
    inbox.list
  );

  router.post(
    '/inbox/action',
    requirePermission({
      pool,
      permissionCode: 'OPS_INBOX_ACTION',
      getDivisionId: async (req) => {
        const itemType = String(req.body?.itemType || '').trim().toUpperCase();
        const entityId = req.body?.entityId;
        if (!itemType || !entityId) return null;

        if (itemType === 'LEAVE_REQUEST') {
          const res = await pool.query(
            `SELECT e.primary_division_id AS division_id
             FROM leave_request lr
             JOIN employee e ON e.id = lr.employee_id
             WHERE lr.id = $1`,
            [entityId]
          );
          return res.rows[0]?.division_id || null;
        }

        if (itemType === 'TIMESHEET') {
          const res = await pool.query(
            `SELECT e.primary_division_id AS division_id
             FROM timesheet_header th
             JOIN employee e ON e.id = th.employee_id
             WHERE th.id = $1`,
            [entityId]
          );
          return res.rows[0]?.division_id || null;
        }

        if (itemType === 'EXPENSE') {
          const res = await pool.query('SELECT division_id FROM expense WHERE id = $1', [entityId]);
          return res.rows[0]?.division_id || null;
        }

        if (itemType === 'INCOME') {
          const res = await pool.query('SELECT division_id FROM income WHERE id = $1', [entityId]);
          return res.rows[0]?.division_id || null;
        }

        return null;
      }
    }),
    inbox.action
  );

  router.get(
    '/alerts',
    requirePermission({
      pool,
      permissionCode: 'OPS_ALERT_READ',
      getDivisionId: async (req) => (req.query?.divisionId ? String(req.query.divisionId) : null)
    }),
    alerts.list
  );

  router.post(
    '/alerts/:id/acknowledge',
    requirePermission({
      pool,
      permissionCode: 'OPS_ALERT_ACK',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT division_id FROM ops_alert WHERE id = $1', [req.params.id]);
        return res.rows[0]?.division_id || null;
      }
    }),
    alerts.acknowledge
  );

  router.post(
    '/alerts/:id/resolve',
    requirePermission({
      pool,
      permissionCode: 'OPS_ALERT_RESOLVE',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT division_id FROM ops_alert WHERE id = $1', [req.params.id]);
        return res.rows[0]?.division_id || null;
      }
    }),
    alerts.resolve
  );

  router.post(
    '/overrides',
    requirePermission({
      pool,
      permissionCode: 'OPS_OVERRIDE_REQUEST',
      getDivisionId: async (req) => (req.body?.divisionId ? String(req.body.divisionId) : null)
    }),
    overrides.create
  );

  router.get(
    '/overrides',
    requirePermission({
      pool,
      permissionCode: 'OPS_OVERRIDE_REVIEW',
      getDivisionId: async (req) => (req.query?.divisionId ? String(req.query.divisionId) : null)
    }),
    overrides.list
  );

  router.post(
    '/overrides/:id/approve',
    requirePermission({
      pool,
      permissionCode: 'OPS_OVERRIDE_REVIEW',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT division_id FROM override_request WHERE id = $1', [req.params.id]);
        return res.rows[0]?.division_id || null;
      }
    }),
    overrides.approve
  );

  router.post(
    '/overrides/:id/reject',
    requirePermission({
      pool,
      permissionCode: 'OPS_OVERRIDE_REVIEW',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT division_id FROM override_request WHERE id = $1', [req.params.id]);
        return res.rows[0]?.division_id || null;
      }
    }),
    overrides.reject
  );

  router.post(
    '/overrides/:id/execute',
    requirePermission({
      pool,
      permissionCode: 'OPS_OVERRIDE_EXECUTE',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT division_id FROM override_request WHERE id = $1', [req.params.id]);
        return res.rows[0]?.division_id || null;
      }
    }),
    overrides.execute
  );

  router.post(
    '/data-quality/run',
    requirePermission({
      pool,
      permissionCode: 'OPS_DATA_QUALITY_RUN',
      getDivisionId: async (req) => (req.body?.divisionId ? String(req.body.divisionId) : null)
    }),
    dq.run
  );

  router.get(
    '/data-quality/findings',
    requirePermission({
      pool,
      permissionCode: 'OPS_DATA_QUALITY_READ',
      getDivisionId: async (req) => (req.query?.divisionId ? String(req.query.divisionId) : null)
    }),
    dq.listFindings
  );

  router.post(
    '/data-quality/findings/:id/acknowledge',
    requirePermission({
      pool,
      permissionCode: 'OPS_DATA_QUALITY_ACK',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT division_id FROM data_quality_finding WHERE id = $1', [req.params.id]);
        return res.rows[0]?.division_id || null;
      }
    }),
    dq.acknowledge
  );

  router.post(
    '/data-quality/findings/:id/resolve',
    requirePermission({
      pool,
      permissionCode: 'OPS_DATA_QUALITY_RESOLVE',
      getDivisionId: async (req) => {
        const res = await pool.query('SELECT division_id FROM data_quality_finding WHERE id = $1', [req.params.id]);
        return res.rows[0]?.division_id || null;
      }
    }),
    dq.resolve
  );

  router.get(
    '/dashboard/summary',
    requirePermission({
      pool,
      permissionCode: 'OPS_DASHBOARD_READ',
      getDivisionId: async () => null
    }),
    dash.summary
  );

  return router;
}
