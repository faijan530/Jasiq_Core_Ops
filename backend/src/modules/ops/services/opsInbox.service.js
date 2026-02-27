import crypto from 'node:crypto';

import { withTransaction } from '../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../shared/kernel/audit.js';
import { badRequest, conflict, notFound } from '../../../shared/kernel/errors.js';

import { queryOpsInbox } from '../repositories/opsInbox.query.js';
import { assertCanAccessDivision } from './divisionScopePolicy.service.js';
import { assertHasPermission } from './permissionPolicy.service.js';
import { readOpsConfig, assertOpsInboxEnabled } from './opsPolicy.service.js';

function monthStartUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function normalizeAction(action) {
  return String(action || '').trim().toUpperCase();
}

async function resolveDivisionForEntity(client, { itemType, entityId }) {
  const t = String(itemType || '').toUpperCase();

  if (t === 'LEAVE_REQUEST') {
    const res = await client.query(
      `SELECT e.primary_division_id AS division_id
       FROM leave_request lr
       JOIN employee e ON e.id = lr.employee_id
       WHERE lr.id = $1`,
      [entityId]
    );
    return res.rows[0]?.division_id || null;
  }

  if (t === 'TIMESHEET') {
    const res = await client.query(
      `SELECT e.primary_division_id AS division_id
       FROM timesheet_header th
       JOIN employee e ON e.id = th.employee_id
       WHERE th.id = $1`,
      [entityId]
    );
    return res.rows[0]?.division_id || null;
  }

  if (t === 'EXPENSE') {
    const res = await client.query('SELECT division_id FROM expense WHERE id = $1', [entityId]);
    return res.rows[0]?.division_id || null;
  }

  if (t === 'INCOME') {
    const res = await client.query('SELECT division_id FROM income WHERE id = $1', [entityId]);
    return res.rows[0]?.division_id || null;
  }

  if (t === 'PAYROLL_RUN') {
    return null;
  }

  if (t === 'MONTH_CLOSE') {
    return null;
  }

  throw badRequest('Unsupported itemType');
}

export async function listOpsInboxService(pool, { actorId, divisionId, limit }) {
  const cfg = await readOpsConfig(pool);
  assertOpsInboxEnabled(cfg);

  if (divisionId) {
    await assertCanAccessDivision(pool, { actorId, divisionId });
    await assertHasPermission(pool, { actorId, permissionCode: 'OPS_INBOX_READ', divisionId });
  } else {
    await assertHasPermission(pool, { actorId, permissionCode: 'OPS_INBOX_READ', divisionId: null });
  }

  const items = await queryOpsInbox(pool, { actorId, divisionId: divisionId || null, limit: Number(limit || 50) });
  return { items };
}

export async function executeInboxActionService(pool, { actorId, actorRole, requestId, itemType, entityId, action, reason }) {
  const cfg = await readOpsConfig(pool);
  assertOpsInboxEnabled(cfg);

  const act = normalizeAction(action);
  const trimmedReason = String(reason || '').trim() || null;

  return withTransaction(pool, async (client) => {
    const divisionId = await resolveDivisionForEntity(client, { itemType, entityId });

    if (divisionId) {
      await assertCanAccessDivision(pool, { actorId, divisionId });
      await assertHasPermission(pool, { actorId, permissionCode: 'OPS_INBOX_ACTION', divisionId });
    } else {
      await assertHasPermission(pool, { actorId, permissionCode: 'OPS_INBOX_ACTION', divisionId: null });
    }

    const t = String(itemType || '').toUpperCase();

    if (t === 'LEAVE_REQUEST') {
      const res = await client.query('SELECT * FROM leave_request WHERE id = $1 FOR UPDATE', [entityId]);
      const row = res.rows[0];
      if (!row) throw notFound('Leave request not found');
      if (row.status !== 'SUBMITTED') throw conflict('Leave request is not submitted');

      if (act === 'APPROVE') {
        const upd = await client.query(
          `UPDATE leave_request
           SET status = 'APPROVED',
               approved_l1_by = $2,
               approved_l1_at = NOW(),
               approved_l2_by = $2,
               approved_l2_at = NOW(),
               rejected_by = NULL,
               rejected_at = NULL,
               rejection_reason = NULL,
               updated_at = NOW(),
               version = version + 1
           WHERE id = $1
           RETURNING *`,
          [entityId, actorId]
        );

        await writeAuditLog(client, {
          requestId,
          entityType: 'LEAVE_REQUEST',
          entityId,
          action: 'OPS_INBOX_APPROVE',
          beforeData: { status: row.status },
          afterData: { status: upd.rows[0].status },
          actorId,
          actorRole,
          reason: trimmedReason
        });

        return { itemType: t, entityId, action: act, status: upd.rows[0].status };
      }

      if (act === 'REJECT') {
        const upd = await client.query(
          `UPDATE leave_request
           SET status = 'REJECTED',
               rejected_by = $2,
               rejected_at = NOW(),
               rejection_reason = $3,
               updated_at = NOW(),
               version = version + 1
           WHERE id = $1
           RETURNING *`,
          [entityId, actorId, trimmedReason || 'Rejected']
        );

        await writeAuditLog(client, {
          requestId,
          entityType: 'LEAVE_REQUEST',
          entityId,
          action: 'OPS_INBOX_REJECT',
          beforeData: { status: row.status },
          afterData: { status: upd.rows[0].status, rejection_reason: upd.rows[0].rejection_reason },
          actorId,
          actorRole,
          reason: trimmedReason
        });

        return { itemType: t, entityId, action: act, status: upd.rows[0].status };
      }

      throw badRequest('Unsupported action for itemType');
    }

    if (t === 'TIMESHEET') {
      const res = await client.query('SELECT * FROM timesheet_header WHERE id = $1 FOR UPDATE', [entityId]);
      const row = res.rows[0];
      if (!row) throw notFound('Timesheet not found');
      if (row.status !== 'SUBMITTED') throw conflict('Timesheet is not submitted');

      if (act === 'APPROVE') {
        const upd = await client.query(
          `UPDATE timesheet_header
           SET status = 'APPROVED',
               approved_l1_by = $2,
               approved_l1_at = COALESCE(approved_l1_at, NOW()),
               approved_l2_by = $2,
               approved_l2_at = NOW(),
               rejected_by = NULL,
               rejected_at = NULL,
               rejected_reason = NULL,
               revision_requested_by = NULL,
               revision_requested_at = NULL,
               revision_requested_reason = NULL,
               updated_at = NOW(),
               version = version + 1
           WHERE id = $1
           RETURNING *`,
          [entityId, actorId]
        );

        await writeAuditLog(client, {
          requestId,
          entityType: 'TIMESHEET',
          entityId,
          action: 'OPS_INBOX_APPROVE',
          beforeData: { status: row.status },
          afterData: { status: upd.rows[0].status },
          actorId,
          actorRole,
          reason: trimmedReason
        });

        return { itemType: t, entityId, action: act, status: upd.rows[0].status };
      }

      if (act === 'REJECT') {
        const upd = await client.query(
          `UPDATE timesheet_header
           SET status = 'REJECTED',
               rejected_by = $2,
               rejected_at = NOW(),
               rejected_reason = $3,
               updated_at = NOW(),
               version = version + 1
           WHERE id = $1
           RETURNING *`,
          [entityId, actorId, trimmedReason || 'Rejected']
        );

        await writeAuditLog(client, {
          requestId,
          entityType: 'TIMESHEET',
          entityId,
          action: 'OPS_INBOX_REJECT',
          beforeData: { status: row.status },
          afterData: { status: upd.rows[0].status, rejected_reason: upd.rows[0].rejected_reason },
          actorId,
          actorRole,
          reason: trimmedReason
        });

        return { itemType: t, entityId, action: act, status: upd.rows[0].status };
      }

      if (act === 'REQUEST_REVISION') {
        const upd = await client.query(
          `UPDATE timesheet_header
           SET status = 'REVISION_REQUIRED',
               revision_requested_by = $2,
               revision_requested_at = NOW(),
               revision_requested_reason = $3,
               updated_at = NOW(),
               version = version + 1
           WHERE id = $1
           RETURNING *`,
          [entityId, actorId, trimmedReason || 'Revision requested']
        );

        await writeAuditLog(client, {
          requestId,
          entityType: 'TIMESHEET',
          entityId,
          action: 'OPS_INBOX_REQUEST_REVISION',
          beforeData: { status: row.status },
          afterData: { status: upd.rows[0].status, revision_requested_reason: upd.rows[0].revision_requested_reason },
          actorId,
          actorRole,
          reason: trimmedReason
        });

        return { itemType: t, entityId, action: act, status: upd.rows[0].status };
      }

      throw badRequest('Unsupported action for itemType');
    }

    if (t === 'EXPENSE') {
      const res = await client.query('SELECT * FROM expense WHERE id = $1 FOR UPDATE', [entityId]);
      const row = res.rows[0];
      if (!row) throw notFound('Expense not found');
      if (row.status !== 'SUBMITTED') throw conflict('Expense is not submitted');

      if (act === 'APPROVE') {
        const upd = await client.query(
          `UPDATE expense
           SET status = 'APPROVED',
               approved_at = NOW(),
               approved_by = $2,
               rejected_at = NULL,
               rejected_by = NULL,
               decision_reason = NULL,
               updated_at = NOW(),
               version = version + 1
           WHERE id = $1
           RETURNING *`,
          [entityId, actorId]
        );

        await writeAuditLog(client, {
          requestId,
          entityType: 'EXPENSE',
          entityId,
          action: 'OPS_INBOX_APPROVE',
          beforeData: { status: row.status },
          afterData: { status: upd.rows[0].status },
          actorId,
          actorRole,
          reason: trimmedReason
        });

        return { itemType: t, entityId, action: act, status: upd.rows[0].status };
      }

      if (act === 'REJECT') {
        const upd = await client.query(
          `UPDATE expense
           SET status = 'REJECTED',
               rejected_at = NOW(),
               rejected_by = $2,
               decision_reason = $3,
               updated_at = NOW(),
               version = version + 1
           WHERE id = $1
           RETURNING *`,
          [entityId, actorId, trimmedReason || 'Rejected']
        );

        await writeAuditLog(client, {
          requestId,
          entityType: 'EXPENSE',
          entityId,
          action: 'OPS_INBOX_REJECT',
          beforeData: { status: row.status },
          afterData: { status: upd.rows[0].status, decision_reason: upd.rows[0].decision_reason },
          actorId,
          actorRole,
          reason: trimmedReason
        });

        return { itemType: t, entityId, action: act, status: upd.rows[0].status };
      }

      throw badRequest('Unsupported action for itemType');
    }

    if (t === 'INCOME') {
      const res = await client.query('SELECT * FROM income WHERE id = $1 FOR UPDATE', [entityId]);
      const row = res.rows[0];
      if (!row) throw notFound('Income not found');
      if (row.status !== 'SUBMITTED') throw conflict('Income is not submitted');

      if (act === 'APPROVE') {
        const upd = await client.query(
          `UPDATE income
           SET status = 'APPROVED',
               approved_at = NOW(),
               approved_by = $2,
               rejected_at = NULL,
               rejected_by = NULL,
               decision_reason = NULL,
               updated_at = NOW(),
               version = version + 1
           WHERE id = $1
           RETURNING *`,
          [entityId, actorId]
        );

        await writeAuditLog(client, {
          requestId,
          entityType: 'INCOME',
          entityId,
          action: 'OPS_INBOX_APPROVE',
          beforeData: { status: row.status },
          afterData: { status: upd.rows[0].status },
          actorId,
          actorRole,
          reason: trimmedReason
        });

        return { itemType: t, entityId, action: act, status: upd.rows[0].status };
      }

      if (act === 'REJECT') {
        const upd = await client.query(
          `UPDATE income
           SET status = 'REJECTED',
               rejected_at = NOW(),
               rejected_by = $2,
               decision_reason = $3,
               updated_at = NOW(),
               version = version + 1
           WHERE id = $1
           RETURNING *`,
          [entityId, actorId, trimmedReason || 'Rejected']
        );

        await writeAuditLog(client, {
          requestId,
          entityType: 'INCOME',
          entityId,
          action: 'OPS_INBOX_REJECT',
          beforeData: { status: row.status },
          afterData: { status: upd.rows[0].status, decision_reason: upd.rows[0].decision_reason },
          actorId,
          actorRole,
          reason: trimmedReason
        });

        return { itemType: t, entityId, action: act, status: upd.rows[0].status };
      }

      throw badRequest('Unsupported action for itemType');
    }

    if (t === 'PAYROLL_RUN') {
      const res = await client.query('SELECT * FROM payroll_run WHERE id = $1 FOR UPDATE', [entityId]);
      const row = res.rows[0];
      if (!row) throw notFound('Payroll run not found');

      if (act !== 'LOCK') throw badRequest('Unsupported action for itemType');
      if (row.status !== 'REVIEWED') throw conflict('Payroll run is not in REVIEWED status');

      const upd = await client.query(
        `UPDATE payroll_run
         SET status = 'LOCKED',
             locked_at = NOW(),
             locked_by = $2,
             updated_at = NOW(),
             version = version + 1
         WHERE id = $1
         RETURNING *`,
        [entityId, actorId]
      );

      await writeAuditLog(client, {
        requestId,
        entityType: 'PAYROLL_RUN',
        entityId,
        action: 'OPS_INBOX_LOCK',
        beforeData: { status: row.status },
        afterData: { status: upd.rows[0].status },
        actorId,
        actorRole,
        reason: trimmedReason
      });

      return { itemType: t, entityId, action: act, status: upd.rows[0].status };
    }

    if (t === 'MONTH_CLOSE') {
      if (act !== 'CLOSE' && act !== 'OPEN') throw badRequest('Unsupported action for itemType');

      const now = new Date();
      const m = monthStartUtc(now).toISOString().slice(0, 10);

      const existingRes = await client.query(
        `SELECT * FROM month_close WHERE month = $1 AND scope = $2 FOR UPDATE`,
        [m, 'COMPANY']
      );

      const existing = existingRes.rows[0] || null;

      if (!existing) {
        if (act === 'OPEN') throw conflict('Month already open');

        const inserted = await client.query(
          `INSERT INTO month_close (id, month, scope, status, closed_at, closed_by, closed_reason)
           VALUES ($1,$2,$3,$4,NOW(),$5,$6)
           RETURNING *`,
          [crypto.randomUUID(), m, 'COMPANY', 'CLOSED', actorId, trimmedReason || 'Ops inbox close']
        );

        await writeAuditLog(client, {
          requestId,
          entityType: 'MONTH_CLOSE',
          entityId: inserted.rows[0].id,
          action: 'OPS_INBOX_CLOSE',
          beforeData: { month: m, scope: 'COMPANY', status: 'OPEN' },
          afterData: { month: inserted.rows[0].month, scope: inserted.rows[0].scope, status: inserted.rows[0].status },
          actorId,
          actorRole,
          reason: trimmedReason
        });

        return { itemType: t, entityId: inserted.rows[0].id, action: act, status: inserted.rows[0].status };
      }

      if (existing.status === (act === 'CLOSE' ? 'CLOSED' : 'OPEN')) {
        throw conflict(`Month already ${existing.status === 'CLOSED' ? 'closed' : 'open'}`);
      }

      const upd = await client.query(
        `UPDATE month_close
         SET status = $2,
             closed_at = CASE WHEN $2 = 'CLOSED' THEN NOW() ELSE NULL END,
             closed_by = CASE WHEN $2 = 'CLOSED' THEN $3 ELSE NULL END,
             closed_reason = CASE WHEN $2 = 'CLOSED' THEN $4 ELSE NULL END
         WHERE id = $1
         RETURNING *`,
        [existing.id, act === 'CLOSE' ? 'CLOSED' : 'OPEN', actorId, trimmedReason || (act === 'CLOSE' ? 'Ops inbox close' : 'Ops inbox open')]
      );

      await writeAuditLog(client, {
        requestId,
        entityType: 'MONTH_CLOSE',
        entityId: existing.id,
        action: act === 'CLOSE' ? 'OPS_INBOX_CLOSE' : 'OPS_INBOX_OPEN',
        beforeData: { month: existing.month, scope: existing.scope, status: existing.status },
        afterData: { month: upd.rows[0].month, scope: upd.rows[0].scope, status: upd.rows[0].status },
        actorId,
        actorRole,
        reason: trimmedReason
      });

      return { itemType: t, entityId: upd.rows[0].id, action: act, status: upd.rows[0].status };
    }

    throw badRequest('Unsupported itemType');
  });
}
