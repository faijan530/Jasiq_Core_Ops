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

export async function getMyTimesheets(pool, { actorId, query }) {
  const cfg = await readTimesheetConfig(pool);
  assertTimesheetEnabled(cfg);

  const employee = await getEmployeeForTimesheet(pool, actorId);
  assertEmployeeEligible({ employee, cfg });

  const { offset, limit, page, pageSize } = parsePagination(query || {});
  const rows = await listTimesheetsForEmployee(pool, { employeeId: actorId, offset, limit });
  const total = await countTimesheetsForEmployee(pool, { employeeId: actorId });

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

  return {
    header: dtoHeader(row),
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

    return {
      header: dtoHeader(outHeader),
      worklogs: outLogs.map(dtoWorklog)
    };
  });
}

export async function submitTimesheet(pool, { id, actorId, requestId }) {
  const cfg = await readTimesheetConfig(pool);
  assertTimesheetEnabled(cfg);

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

  return withTransaction(pool, async (client) => {
    const header = await getTimesheetHeaderByIdForUpdate(client, { id });
    if (!header) throw badRequest('Timesheet not found');

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

    if (header.status !== TIMESHEET_STATUS.SUBMITTED) throw badRequest('Timesheet is not SUBMITTED');

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
      if (!header.approved_l1_at) {
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

  return withTransaction(pool, async (client) => {
    const header = await getTimesheetHeaderByIdForUpdate(client, { id });
    if (!header) throw badRequest('Timesheet not found');

    await assertActorCanAccessEmployee(client, {
      actorId,
      permissionCode: 'TIMESHEET_APPROVE_L1',
      employeeId: header.employee_id
    });

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

  return withTransaction(pool, async (client) => {
    const header = await getTimesheetHeaderByIdForUpdate(client, { id });
    if (!header) throw badRequest('Timesheet not found');

    await assertActorCanAccessEmployee(client, {
      actorId,
      permissionCode: 'TIMESHEET_APPROVE_L1',
      employeeId: header.employee_id
    });

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

export async function listApprovals(pool, { query }) {
  const cfg = await readTimesheetConfig(pool);
  assertTimesheetEnabled(cfg);

  const { offset, limit, page, pageSize } = parsePagination(query || {});
  const divisionId = query?.divisionId ? String(query.divisionId) : null;

  const rows = await listApprovalsQueue(pool, { divisionId, offset, limit });
  const total = await countApprovalsQueue(pool, { divisionId });

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
      pendingApprovalLevel: cfg.approvalLevels === 1 ? 1 : (r.approved_l1_at ? 2 : 1)
    })),
    total,
    page,
    pageSize
  });
}
