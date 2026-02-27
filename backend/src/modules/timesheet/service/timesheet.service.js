import crypto from 'node:crypto';

import { withTransaction } from '../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../shared/kernel/audit.js';
import { badRequest, forbidden } from '../../../shared/kernel/errors.js';
import { parsePagination, pagedResponse } from '../../../shared/kernel/pagination.js';

import { TimesheetHeader } from '../domain/entities/timesheet.entity.js';
import { Worklog } from '../domain/entities/worklog.entity.js';
import { TIMESHEET_STATUS } from '../domain/valueObjects/timesheetStatus.vo.js';
import { calculatePeriod } from './periodCalculator.service.js';
import { assertMaxHoursPerDay } from '../domain/valueObjects/workHours.vo.js';

import {
  assertEmployeeEligible,
  assertMonthOpenForDate,
  assertNotFuture,
  assertTimesheetEnabled,
  readTimesheetConfig
} from './timesheetPolicy.service.js';

import {
  countApprovalsQueue,
  countTimesheetsForEmployee,
  getEmployeeForTimesheet,
  getTimesheetHeaderByEmployeePeriodForUpdate,
  getTimesheetHeaderById,
  getTimesheetHeaderByIdForUpdate,
  getTodayDateOnly,
  insertTimesheetHeader,
  listApprovalsQueue,
  listTimesheetsForEmployee,
  updateTimesheetHeaderState
} from '../repository/timesheet.repository.js';

import { listActiveWorklogsForTimesheet, sumActiveHoursForDate, upsertWorklog } from '../repository/worklog.repository.js';

function conflict(message) {
  const err = new Error(message);
  err.status = 409;
  err.code = 'CONFLICT';
  return err;
}

async function assertActorCanAccessEmployee(client, { actorId, permissionCode, employeeId }) {
  const resEmp = await client.query('SELECT primary_division_id FROM employee WHERE id = $1', [employeeId]);
  const divisionId = resEmp.rows[0]?.primary_division_id || null;

  const res = await client.query(
    `SELECT 1
     FROM user_role ur
     JOIN role_permission rp ON rp.role_id = ur.role_id
     JOIN permission p ON p.id = rp.permission_id
     WHERE ur.user_id = $1
       AND p.code = $2
       AND (
         ur.scope = 'COMPANY'
         OR (ur.scope = 'DIVISION' AND $3::uuid IS NOT NULL AND ur.division_id = $3)
       )
     LIMIT 1`,
    [actorId, permissionCode, divisionId]
  );

  if (res.rowCount === 0) {
    throw forbidden();
  }
}

function requireReason(reason) {
  const s = String(reason || '').trim();
  if (!s) throw badRequest('Reason is required');
  return s;
}

function dtoHeader(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    periodType: row.period_type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    locked: Boolean(row.locked),
    submittedAt: row.submitted_at,
    submittedBy: row.submitted_by,
    approvedL1At: row.approved_l1_at,
    approvedL1By: row.approved_l1_by,
    approvedL2At: row.approved_l2_at,
    approvedL2By: row.approved_l2_by,
    rejectedAt: row.rejected_at,
    rejectedBy: row.rejected_by,
    rejectedReason: row.rejected_reason,
    revisionRequestedAt: row.revision_requested_at,
    revisionRequestedBy: row.revision_requested_by,
    revisionRequestedReason: row.revision_requested_reason,
    updatedAt: row.updated_at,
    version: row.version
  };
}

function dtoWorklog(row) {
  return {
    id: row.id,
    workDate: row.work_date,
    task: row.task,
    hours: Number(row.hours),
    description: row.description,
    projectId: row.project_id,
    updatedAt: row.updated_at,
    version: row.version
  };
}

export async function getMyTimesheets(pool, { employeeId, query }) {
  const cfg = await readTimesheetConfig(pool);
  assertTimesheetEnabled(cfg);

  const employee = await getEmployeeForTimesheet(pool, employeeId);
  assertEmployeeEligible({ employee, cfg });

  const { offset, limit, page, pageSize } = parsePagination(query || {});
  const rows = await listTimesheetsForEmployee(pool, { employeeId, offset, limit });
  const total = await countTimesheetsForEmployee(pool, { employeeId });

  return pagedResponse({
    items: rows.map((r) => dtoHeader(r)),
    total,
    page,
    pageSize
  });
}

export async function getTimesheetByIdService(pool, { id }) {
  const row = await getTimesheetHeaderById(pool, { id });
  if (!row) throw badRequest('Timesheet not found');
  const worklogs = await listActiveWorklogsForTimesheet(pool, { timesheetId: id });

  // Calculate total hours from worklogs
  const totalHours = worklogs.reduce((sum, worklog) => sum + Number(worklog.hours || 0), 0);

  return {
    header: {
      ...dtoHeader(row),
      totalHours: totalHours
    },
    worklogs: worklogs.map(dtoWorklog)
  };
}

export async function upsertWorklogService(pool, { employeeId, workDate, task, hours, description, projectId, actorId, requestId }) {
  const cfg = await readTimesheetConfig(pool);
  assertTimesheetEnabled(cfg);

  const employee = await getEmployeeForTimesheet(pool, employeeId);
  assertEmployeeEligible({ employee, cfg });

  if (!cfg.projectTaggingEnabled && projectId) throw badRequest('Project tagging is disabled');

  const todayDate = await getTodayDateOnly(pool);
  if (!todayDate) throw badRequest('Unable to resolve today date');

  const wl = new Worklog({ workDate, task, hours, description, projectId });
  assertNotFuture(wl.workDate, todayDate);

  await assertMonthOpenForDate(pool, { dateIso: wl.workDate });

  const period = calculatePeriod({ cycle: cfg.cycle, dateIso: wl.workDate });

  return withTransaction(pool, async (client) => {
    let header = await getTimesheetHeaderByEmployeePeriodForUpdate(client, {
      employeeId,
      periodType: period.periodType,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd
    });

    if (!header) {
      try {
        header = await insertTimesheetHeader(client, {
          id: crypto.randomUUID(),
          employee_id: employeeId,
          period_type: period.periodType,
          period_start: period.periodStart,
          period_end: period.periodEnd,
          status: TIMESHEET_STATUS.DRAFT,
          locked: false,
          actor_id: actorId
        });

        await writeAuditLog(client, {
          requestId,
          entityType: 'TIMESHEET',
          entityId: header.id,
          action: 'CREATE_HEADER',
          beforeData: null,
          afterData: { employeeId, periodType: period.periodType, periodStart: period.periodStart, periodEnd: period.periodEnd, status: header.status },
          actorId,
          actorRole: null,
          reason: null
        });
      } catch (error) {
        // Handle race condition: if header was created by another request
        if (error.code === '23505' && error.constraint === 'timesheet_header_employee_id_period_type_period_start_perio_key') {
          // Try to fetch the existing header again
          header = await getTimesheetHeaderByEmployeePeriodForUpdate(client, {
            employeeId,
            periodType: period.periodType,
            periodStart: period.periodStart,
            periodEnd: period.periodEnd
          });
          
          if (!header) {
            throw error; // Re-throw if we still can't find it
          }
        } else {
          throw error; // Re-throw other errors
        }
      }
    }

    const entity = new TimesheetHeader(header);

    if (entity.status === TIMESHEET_STATUS.REVISION_REQUIRED || entity.status === TIMESHEET_STATUS.REJECTED) {
      // Move back to DRAFT on first edit
      header = await updateTimesheetHeaderState(client, {
        id: entity.id,
        status: TIMESHEET_STATUS.DRAFT,
        locked: false,
        actorId,
        setSubmitted: false,
        setApprovedL1: false,
        setApprovedL2: false,
        setRejected: false,
        setRevisionRequested: false,
        clearDecisions: true
      });
    }

    const updatedEntity = new TimesheetHeader(header);
    updatedEntity.ensureMutableForWorklog();

    const beforeTotal = await sumActiveHoursForDate(client, { timesheetId: updatedEntity.id, workDate: wl.workDate });

    const saved = await upsertWorklog(client, {
      id: crypto.randomUUID(),
      timesheetId: updatedEntity.id,
      workDate: wl.workDate,
      task: wl.task,
      hours: wl.hours,
      description: wl.description,
      projectId: wl.projectId,
      actorId
    });

    const afterTotal = await sumActiveHoursForDate(client, { timesheetId: updatedEntity.id, workDate: wl.workDate });
    assertMaxHoursPerDay(afterTotal, cfg.maxHoursPerDay);

    await writeAuditLog(client, {
      requestId,
      entityType: 'TIMESHEET_WORKLOG',
      entityId: saved.id,
      action: beforeTotal === afterTotal ? 'UPSERT' : 'UPSERT',
      beforeData: null,
      afterData: {
        timesheetId: updatedEntity.id,
        employeeId,
        workDate: wl.workDate,
        task: wl.task,
        hours: wl.hours,
        totalHoursForDay: afterTotal
      },
      actorId,
      actorRole: null,
      reason: null
    });

    const outHeader = await getTimesheetHeaderById(client, { id: updatedEntity.id });
    const outLogs = await listActiveWorklogsForTimesheet(client, { timesheetId: updatedEntity.id });

    // Calculate total hours from worklogs
    const totalHours = outLogs.reduce((sum, worklog) => sum + Number(worklog.hours || 0), 0);

    return {
      header: {
        ...dtoHeader(outHeader),
        totalHours: totalHours
      },
      worklogs: outLogs.map(dtoWorklog)
    };
  });
}

export async function submitTimesheet(pool, { id, actorId, requestId }) {
  const cfg = await readTimesheetConfig(pool);
  assertTimesheetEnabled(cfg);

  // Resolve actor's employee linkage
  const userRes = await pool.query(
    'SELECT id, employee_id FROM "user" WHERE id = $1',
    [actorId]
  );
  
  if (userRes.rowCount === 0) {
    throw badRequest('User not found');
  }
  
  const user = userRes.rows[0];
  
  if (!user.employee_id) {
    throw badRequest('User is not linked to an employee record');
  }

  return withTransaction(pool, async (client) => {
    const header = await getTimesheetHeaderByIdForUpdate(client, { id });
    if (!header) throw badRequest('Timesheet not found');

    const employee = await getEmployeeForTimesheet(client, header.employee_id);
    assertEmployeeEligible({ employee, cfg });

    await assertMonthOpenForDate(client, { dateIso: header.period_end });

    const entity = new TimesheetHeader(header);

    if (entity.status === TIMESHEET_STATUS.REVISION_REQUIRED || entity.status === TIMESHEET_STATUS.REJECTED) {
      // two-step transition
      await updateTimesheetHeaderState(client, {
        id: entity.id,
        status: TIMESHEET_STATUS.DRAFT,
        locked: false,
        actorId,
        setSubmitted: false,
        setApprovedL1: false,
        setApprovedL2: false,
        setRejected: false,
        setRevisionRequested: false,
        clearDecisions: true
      });
      entity.status = TIMESHEET_STATUS.DRAFT;
    }

    if (entity.status !== TIMESHEET_STATUS.DRAFT) throw badRequest('Timesheet is not in DRAFT state');

    const updated = await updateTimesheetHeaderState(client, {
      id: entity.id,
      status: TIMESHEET_STATUS.SUBMITTED,
      locked: false,
      actorId,
      setSubmitted: true,
      setApprovedL1: false,
      setApprovedL2: false,
      setRejected: false,
      setRevisionRequested: false,
      clearDecisions: true
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'TIMESHEET',
      entityId: updated.id,
      action: 'SUBMIT',
      beforeData: { status: entity.status },
      afterData: { status: updated.status, locked: updated.locked },
      actorId,
      actorRole: null,
      reason: null
    });

    return dtoHeader(updated);
  });
}

export async function approveTimesheet(pool, { id, actorId, requestId }) {
  const cfg = await readTimesheetConfig(pool);
  assertTimesheetEnabled(cfg);

  // Resolve actor's employee linkage
  const userRes = await pool.query(
    'SELECT id, employee_id FROM "user" WHERE id = $1',
    [actorId]
  );
  
  if (userRes.rowCount === 0) {
    throw badRequest('User not found');
  }
  
  const user = userRes.rows[0];
  
  if (!user.employee_id) {
    throw badRequest('User is not linked to an employee record');
  }

  return withTransaction(pool, async (client) => {
    const header = await getTimesheetHeaderByIdForUpdate(client, { id });
    if (!header) throw badRequest('Timesheet not found');

    const isLegacyPendingL2 =
      cfg.approvalLevels === 2 &&
      header.status === TIMESHEET_STATUS.APPROVED &&
      header.approved_l1_at &&
      !header.approved_l2_at;

    // Enforce scoped RBAC for approvals inside the service.
    if (cfg.approvalLevels === 1) {
      await assertActorCanAccessEmployee(client, {
        actorId,
        permissionCode: 'TIMESHEET_APPROVE_L1',
        employeeId: header.employee_id
      });
    } else {
      const required = header.approved_l1_at ? 'TIMESHEET_APPROVE_L2' : 'TIMESHEET_APPROVE_L1';
      await assertActorCanAccessEmployee(client, {
        actorId,
        permissionCode: required,
        employeeId: header.employee_id
      });
    }

    await assertMonthOpenForDate(client, { dateIso: header.period_end });

    if (header.status !== TIMESHEET_STATUS.SUBMITTED && !isLegacyPendingL2) throw badRequest('Timesheet is not SUBMITTED');

    let updated;
    let action;

    if (cfg.approvalLevels === 1) {
      updated = await updateTimesheetHeaderState(client, {
        id,
        status: TIMESHEET_STATUS.APPROVED,
        locked: true,
        actorId,
        setSubmitted: false,
        setApprovedL1: true,
        setApprovedL2: false,
        setRejected: false,
        setRevisionRequested: false,
        clearDecisions: false
      });
      action = 'APPROVE';
    } else {
      if (isLegacyPendingL2) {
        updated = await updateTimesheetHeaderState(client, {
          id,
          status: TIMESHEET_STATUS.APPROVED,
          locked: true,
          actorId,
          setSubmitted: false,
          setApprovedL1: false,
          setApprovedL2: true,
          setRejected: false,
          setRevisionRequested: false,
          clearDecisions: false
        });
        action = 'APPROVE_L2';
      } else if (!header.approved_l1_at) {
        updated = await updateTimesheetHeaderState(client, {
          id,
          status: TIMESHEET_STATUS.SUBMITTED,
          locked: false,
          actorId,
          setSubmitted: false,
          setApprovedL1: true,
          setApprovedL2: false,
          setRejected: false,
          setRevisionRequested: false,
          clearDecisions: false
        });
        action = 'APPROVE_L1';
      } else {
        updated = await updateTimesheetHeaderState(client, {
          id,
          status: TIMESHEET_STATUS.APPROVED,
          locked: true,
          actorId,
          setSubmitted: false,
          setApprovedL1: false,
          setApprovedL2: true,
          setRejected: false,
          setRevisionRequested: false,
          clearDecisions: false
        });
        action = 'APPROVE_L2';
      }
    }

    await writeAuditLog(client, {
      requestId,
      entityType: 'TIMESHEET',
      entityId: updated.id,
      action,
      beforeData: { status: header.status, locked: header.locked },
      afterData: { status: updated.status, locked: updated.locked },
      actorId,
      actorRole: null,
      reason: null
    });

    return dtoHeader(updated);
  });
}

export async function rejectTimesheet(pool, { id, actorId, requestId, reason }) {
  const cfg = await readTimesheetConfig(pool);
  assertTimesheetEnabled(cfg);
  const trimmedReason = requireReason(reason);

  // Resolve actor's employee linkage
  const userRes = await pool.query(
    'SELECT id, employee_id FROM "user" WHERE id = $1',
    [actorId]
  );
  
  if (userRes.rowCount === 0) {
    throw badRequest('User not found');
  }
  
  const user = userRes.rows[0];
  
  if (!user.employee_id) {
    throw badRequest('User is not linked to an employee record');
  }

  return withTransaction(pool, async (client) => {
    const header = await getTimesheetHeaderByIdForUpdate(client, { id });
    if (!header) throw badRequest('Timesheet not found');

    if (cfg.approvalLevels === 1) {
      await assertActorCanAccessEmployee(client, {
        actorId,
        permissionCode: 'TIMESHEET_APPROVE_L1',
        employeeId: header.employee_id
      });
    } else {
      const required = header.approved_l1_at ? 'TIMESHEET_APPROVE_L2' : 'TIMESHEET_APPROVE_L1';
      await assertActorCanAccessEmployee(client, {
        actorId,
        permissionCode: required,
        employeeId: header.employee_id
      });
    }

    await assertMonthOpenForDate(client, { dateIso: header.period_end });

    if (header.status !== TIMESHEET_STATUS.SUBMITTED) throw badRequest('Timesheet is not SUBMITTED');

    const updated = await updateTimesheetHeaderState(client, {
      id,
      status: TIMESHEET_STATUS.REJECTED,
      locked: false,
      actorId,
      setSubmitted: false,
      setApprovedL1: false,
      setApprovedL2: false,
      setRejected: { reason: trimmedReason },
      setRevisionRequested: false,
      clearDecisions: true
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'TIMESHEET',
      entityId: updated.id,
      action: 'REJECT',
      beforeData: { status: header.status },
      afterData: { status: updated.status, locked: updated.locked },
      actorId,
      actorRole: null,
      reason: trimmedReason
    });

    return dtoHeader(updated);
  });
}

export async function requestRevision(pool, { id, actorId, requestId, reason }) {
  const cfg = await readTimesheetConfig(pool);
  assertTimesheetEnabled(cfg);
  const trimmedReason = requireReason(reason);

  // Resolve actor's employee linkage
  const userRes = await pool.query(
    'SELECT id, employee_id FROM "user" WHERE id = $1',
    [actorId]
  );
  
  if (userRes.rowCount === 0) {
    throw badRequest('User not found');
  }
  
  const user = userRes.rows[0];
  
  if (!user.employee_id) {
    throw badRequest('User is not linked to an employee record');
  }

  return withTransaction(pool, async (client) => {
    const header = await getTimesheetHeaderByIdForUpdate(client, { id });
    if (!header) throw badRequest('Timesheet not found');

    if (cfg.approvalLevels === 1) {
      await assertActorCanAccessEmployee(client, {
        actorId,
        permissionCode: 'TIMESHEET_APPROVE_L1',
        employeeId: header.employee_id
      });
    } else {
      const required = header.approved_l1_at ? 'TIMESHEET_APPROVE_L2' : 'TIMESHEET_APPROVE_L1';
      await assertActorCanAccessEmployee(client, {
        actorId,
        permissionCode: required,
        employeeId: header.employee_id
      });
    }

    await assertMonthOpenForDate(client, { dateIso: header.period_end });

    if (header.status !== TIMESHEET_STATUS.SUBMITTED) throw badRequest('Timesheet is not SUBMITTED');

    const updated = await updateTimesheetHeaderState(client, {
      id,
      status: TIMESHEET_STATUS.REVISION_REQUIRED,
      locked: false,
      actorId,
      setSubmitted: false,
      setApprovedL1: false,
      setApprovedL2: false,
      setRejected: false,
      setRevisionRequested: { reason: trimmedReason },
      clearDecisions: true
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'TIMESHEET',
      entityId: updated.id,
      action: 'REQUEST_REVISION',
      beforeData: { status: header.status },
      afterData: { status: updated.status, locked: updated.locked },
      actorId,
      actorRole: null,
      reason: trimmedReason
    });

    return dtoHeader(updated);
  });
}

export async function listApprovals(pool, { query, actorPermissions }) {
  const cfg = await readTimesheetConfig(pool);
  assertTimesheetEnabled(cfg);

  const { offset, limit, page, pageSize } = parsePagination(query || {});
  const divisionId = query?.divisionId ? String(query.divisionId) : null;

  const perms = Array.isArray(actorPermissions) ? actorPermissions : [];
  const canReadQueue = perms.includes('TIMESHEET_APPROVAL_QUEUE_READ');
  const canApproveL1 = perms.includes('TIMESHEET_APPROVE_L1');
  const canApproveL2 = perms.includes('TIMESHEET_APPROVE_L2');
  const desiredLevel = (() => {
    if (cfg.approvalLevels === 1) return 1;

    // HR / queue readers: show a combined queue (L1 + L2 pending) so you never miss items.
    if (canReadQueue) return 0;

    // Approvers: pick the stage they can act on.
    if (canApproveL2 && !canApproveL1) return 2;
    return 1;
  })();

  let rows = await listApprovalsQueue(pool, { divisionId, offset, limit, levels: desiredLevel });
  let total = await countApprovalsQueue(pool, { divisionId, levels: desiredLevel });

  // Fallback: if an L1 approver also has L2 approve permission (but not queue read),
  // and L1 queue is empty, show L2 queue.
  if (cfg.approvalLevels === 2 && desiredLevel === 1 && canApproveL2 && !canReadQueue && total === 0) {
    rows = await listApprovalsQueue(pool, { divisionId, offset, limit, levels: 2 });
    total = await countApprovalsQueue(pool, { divisionId, levels: 2 });
  }

  return pagedResponse({
    items: rows.map((r) => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeCode: r.employee_code,
      firstName: r.first_name,
      lastName: r.last_name,
      primaryDivisionId: r.primary_division_id,
      periodType: r.period_type,
      periodStart: r.period_start,
      periodEnd: r.period_end,
      status: r.status,
      approvedL1At: r.approved_l1_at,
      approvedL2At: r.approved_l2_at,
      pendingApprovalLevel: cfg.approvalLevels === 1 ? 1 : (r.approved_l1_at ? 2 : 1)
    })),
    total,
    page,
    pageSize
  });
}
