import crypto from 'node:crypto';

import { withTransaction } from '../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../shared/kernel/audit.js';
import { badRequest, forbidden } from '../../../shared/kernel/errors.js';
import { getSystemConfigValue, isMonthCloseEnabled } from '../../../shared/kernel/systemConfig.js';

import {
  assertAttendanceSource,
  assertAttendanceStatus,
  assertEmployeeActive,
  assertAttendanceDateAllowed,
  assertSelfMarkingAllowed,
  assertWithinEmploymentPeriod,
  monthEndForAttendanceDate,
  normalizeAttendanceDate
} from '../domain/attendancePolicy.js';

import {
  getAttendanceRecordByEmployeeDate,
  getEmployeeForAttendance,
  getMonthCloseStatus,
  getTodayDateOnly,
  insertAttendanceRecord,
  listAttendanceRecordsForMonth,
  listEmployeesForAttendance,
  updateAttendanceRecord
} from '../repository/attendanceRepository.js';

function hasPermission(actorPermissions, code) {
  return Array.isArray(actorPermissions) && actorPermissions.includes(code);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y, m) {
  // m: 1-12
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  if (m === 4 || m === 6 || m === 9 || m === 11) return 30;
  return 31;
}

// 0=Sunday..6=Saturday
function dayOfWeek(y, m, d) {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let yy = y;
  if (m < 3) yy -= 1;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
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

function monthBounds(month) {
  const m = String(month || '').trim();
  if (!/^\d{4}-\d{2}$/.test(m)) throw badRequest('Invalid month');
  const [y, mm] = m.split('-').map((x) => Number(x));
  const last = daysInMonth(y, mm);
  return {
    startIso: `${y}-${pad2(mm)}-01`,
    endIso: `${y}-${pad2(mm)}-${pad2(last)}`
  };
}

function countWorkingDays({ startIso, endIso }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso) || !/^\d{4}-\d{2}-\d{2}$/.test(endIso)) {
    throw badRequest('Invalid month bounds');
  }

  const [y, mm] = startIso.split('-').map((x) => Number(x));
  const last = Number(endIso.slice(8, 10));

  let c = 0;
  for (let d = 1; d <= last; d++) {
    const dow = dayOfWeek(y, mm, d);
    if (dow !== 0 && dow !== 6) c += 1;
  }
  return c;
}

async function assertMonthOpenForAttendance(client, attendanceDateIso) {
  const enabled = await isMonthCloseEnabled(client);
  if (!enabled) return 'OPEN';

  const monthEndIso = monthEndForAttendanceDate(attendanceDateIso);
  const status = await getMonthCloseStatus(client, { monthEndIso });
  if (status === 'CLOSED') throw forbidden('Month is closed');
  return status;
}

async function isSelfMarkEnabled(pool) {
  const value = await getSystemConfigValue(pool, 'ATTENDANCE_SELF_MARK_ENABLED');
  if (value === null) return false;
  const v = String(value).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'enabled';
}

export async function markAttendance(pool, { employeeId, attendanceDate, status, source, note, reason, actorId, requestId, actorPermissions }) {
  if (!hasPermission(actorPermissions, 'ATTENDANCE_WRITE')) throw forbidden();

  assertAttendanceStatus(status);
  assertAttendanceSource(source);

  const attendanceDateIso = normalizeAttendanceDate(attendanceDate);

  const selfEnabled = await isSelfMarkEnabled(pool);
  assertSelfMarkingAllowed({ actorId, employeeId, source, selfMarkEnabled: selfEnabled });

  return withTransaction(pool, async (client) => {
    const todayDate = await getTodayDateOnly(client);
    assertAttendanceDateAllowed(attendanceDateIso, { todayDate });

    await assertActorCanAccessEmployee(client, { actorId, permissionCode: 'ATTENDANCE_WRITE', employeeId });

    const employee = await getEmployeeForAttendance(client, employeeId);
    assertEmployeeActive(employee);
    assertWithinEmploymentPeriod(employee, attendanceDateIso);

    const monthStatus = await assertMonthOpenForAttendance(client, attendanceDateIso);

    const existing = await getAttendanceRecordByEmployeeDate(client, { employeeId, attendanceDate: attendanceDateIso });
    if (existing) {
      if (!hasPermission(actorPermissions, 'ATTENDANCE_OVERRIDE')) {
        throw conflictOverrideRequired();
      }

      const trimmedReason = String(reason || '').trim();
      if (!trimmedReason) throw badRequest('Reason is required');

      await assertActorCanAccessEmployee(client, { actorId, permissionCode: 'ATTENDANCE_OVERRIDE', employeeId });

      const before = {
        employee_id: existing.employee_id,
        attendance_date: existing.attendance_date,
        status: existing.status,
        source: existing.source,
        note: existing.note
      };

      const updated = await updateAttendanceRecord(client, {
        id: existing.id,
        status: String(status).toUpperCase(),
        source: String(source).toUpperCase(),
        note: note ? String(note).trim() : null,
        markedBy: actorId
      });

      await writeAuditLog(client, {
        requestId,
        entityType: 'ATTENDANCE',
        entityId: updated.id,
        action: 'OVERRIDE',
        beforeData: before,
        afterData: {
          employee_id: updated.employee_id,
          attendance_date: updated.attendance_date,
          status: updated.status,
          source: updated.source,
          note: updated.note
        },
        actorId,
        actorRole: null,
        reason: trimmedReason
      });

      return { row: updated, monthStatus };
    }

    const inserted = await insertAttendanceRecord(client, {
      id: crypto.randomUUID(),
      employee_id: employeeId,
      attendance_date: attendanceDateIso,
      status: String(status).toUpperCase(),
      source: String(source).toUpperCase(),
      note: note ? String(note).trim() : null,
      marked_by: actorId,
      version: 1
    });

    if (!inserted) {
      const conflict = await getAttendanceRecordByEmployeeDate(client, { employeeId, attendanceDate: attendanceDateIso });
      if (conflict) {
        throw conflictOverrideRequired();
      }
      throw badRequest('Failed to mark attendance');
    }

    await writeAuditLog(client, {
      requestId,
      entityType: 'ATTENDANCE',
      entityId: inserted.id,
      action: 'MARK',
      beforeData: null,
      afterData: {
        employee_id: inserted.employee_id,
        attendance_date: inserted.attendance_date,
        status: inserted.status,
        source: inserted.source,
        note: inserted.note
      },
      actorId,
      actorRole: null,
      reason: null
    });

    return { row: inserted, monthStatus };
  });
}

function conflictOverrideRequired() {
  const err = new Error('Attendance record already exists; override required');
  err.status = 409;
  err.code = 'CONFLICT';
  return err;
}

export async function overrideAttendance(pool, { employeeId, attendanceDate, status, source, note, reason, actorId, requestId, actorPermissions }) {
  if (!hasPermission(actorPermissions, 'ATTENDANCE_OVERRIDE')) throw forbidden();

  assertAttendanceStatus(status);
  assertAttendanceSource(source);

  const attendanceDateIso = normalizeAttendanceDate(attendanceDate);

  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) throw badRequest('Reason is required');

  const selfEnabled = await isSelfMarkEnabled(pool);
  assertSelfMarkingAllowed({ actorId, employeeId, source, selfMarkEnabled: selfEnabled });

  return withTransaction(pool, async (client) => {
    const todayDate = await getTodayDateOnly(client);
    assertAttendanceDateAllowed(attendanceDateIso, { todayDate });

    await assertActorCanAccessEmployee(client, { actorId, permissionCode: 'ATTENDANCE_OVERRIDE', employeeId });

    const employee = await getEmployeeForAttendance(client, employeeId);
    assertEmployeeActive(employee);
    assertWithinEmploymentPeriod(employee, attendanceDateIso);

    const monthStatus = await assertMonthOpenForAttendance(client, attendanceDateIso);

    const existing = await getAttendanceRecordByEmployeeDate(client, { employeeId, attendanceDate: attendanceDateIso });
    if (!existing) throw badRequest('Attendance record does not exist');

    const before = {
      employee_id: existing.employee_id,
      attendance_date: existing.attendance_date,
      status: existing.status,
      source: existing.source,
      note: existing.note
    };

    const updated = await updateAttendanceRecord(client, {
      id: existing.id,
      status: String(status).toUpperCase(),
      source: String(source).toUpperCase(),
      note: note ? String(note).trim() : null,
      markedBy: actorId
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'ATTENDANCE',
      entityId: updated.id,
      action: 'OVERRIDE',
      beforeData: before,
      afterData: {
        employee_id: updated.employee_id,
        attendance_date: updated.attendance_date,
        status: updated.status,
        source: updated.source,
        note: updated.note
      },
      actorId,
      actorRole: null,
      reason: trimmedReason
    });

    return { row: updated, monthStatus };
  });
}

export async function bulkMarkAttendance(pool, { attendanceDate, source, items, actorId, requestId, actorPermissions }) {
  if (!hasPermission(actorPermissions, 'ATTENDANCE_BULK_WRITE')) throw forbidden();

  assertAttendanceSource(source);

  const attendanceDateIso = normalizeAttendanceDate(attendanceDate);

  const selfEnabled = await isSelfMarkEnabled(pool);

  return withTransaction(pool, async (client) => {
    const todayDate = await getTodayDateOnly(client);
    assertAttendanceDateAllowed(attendanceDateIso, { todayDate });

    await assertMonthOpenForAttendance(client, attendanceDateIso);

    const results = [];

    for (const item of items || []) {
      try {
        const employeeId = item.employeeId;
        assertAttendanceStatus(item.status);

        assertSelfMarkingAllowed({ actorId, employeeId, source, selfMarkEnabled: selfEnabled });

        await assertActorCanAccessEmployee(client, { actorId, permissionCode: 'ATTENDANCE_BULK_WRITE', employeeId });

        const employee = await getEmployeeForAttendance(client, employeeId);
        assertEmployeeActive(employee);
        assertWithinEmploymentPeriod(employee, attendanceDateIso);

        const existing = await getAttendanceRecordByEmployeeDate(client, { employeeId, attendanceDate: attendanceDateIso });
        if (existing) {
          if (!hasPermission(actorPermissions, 'ATTENDANCE_OVERRIDE')) {
            results.push({ employeeId, attendanceDate: attendanceDateIso, status: item.status, outcome: 'FAILED', error: 'Override permission required' });
            continue;
          }

          const trimmedReason = String(item.reason || '').trim();
          if (!trimmedReason) {
            results.push({ employeeId, attendanceDate: attendanceDateIso, status: item.status, outcome: 'FAILED', error: 'Reason is required for override' });
            continue;
          }

          await assertActorCanAccessEmployee(client, { actorId, permissionCode: 'ATTENDANCE_OVERRIDE', employeeId });

          const before = {
            employee_id: existing.employee_id,
            attendance_date: existing.attendance_date,
            status: existing.status,
            source: existing.source,
            note: existing.note
          };

          const updated = await updateAttendanceRecord(client, {
            id: existing.id,
            status: String(item.status).toUpperCase(),
            source: String(source).toUpperCase(),
            note: item.note ? String(item.note).trim() : null,
            markedBy: actorId
          });

          await writeAuditLog(client, {
            requestId,
            entityType: 'ATTENDANCE',
            entityId: updated.id,
            action: 'OVERRIDE',
            beforeData: before,
            afterData: {
              employee_id: updated.employee_id,
              attendance_date: updated.attendance_date,
              status: updated.status,
              source: updated.source,
              note: updated.note
            },
            actorId,
            actorRole: null,
            reason: trimmedReason
          });

          results.push({ employeeId, attendanceDate: attendanceDateIso, status: item.status, outcome: 'UPDATED' });
          continue;
        }

        const inserted = await insertAttendanceRecord(client, {
          id: crypto.randomUUID(),
          employee_id: employeeId,
          attendance_date: attendanceDateIso,
          status: String(item.status).toUpperCase(),
          source: String(source).toUpperCase(),
          note: item.note ? String(item.note).trim() : null,
          marked_by: actorId,
          version: 1
        });

        if (!inserted) {
          results.push({ employeeId, attendanceDate: attendanceDateIso, status: item.status, outcome: 'FAILED', error: 'Conflict' });
          continue;
        }

        await writeAuditLog(client, {
          requestId,
          entityType: 'ATTENDANCE',
          entityId: inserted.id,
          action: 'BULK_MARK',
          beforeData: null,
          afterData: {
            employee_id: inserted.employee_id,
            attendance_date: inserted.attendance_date,
            status: inserted.status,
            source: inserted.source,
            note: inserted.note
          },
          actorId,
          actorRole: null,
          reason: null
        });

        results.push({ employeeId, attendanceDate: attendanceDateIso, status: item.status, outcome: 'CREATED' });
      } catch (err) {
        results.push({ employeeId: item.employeeId, attendanceDate: attendanceDateIso, status: item.status, outcome: 'FAILED', error: err?.message || 'Failed' });
      }
    }

    return { results };
  });
}

export async function getAttendanceByMonth(pool, { month, divisionId, actorId, actorPermissions }) {
  const client = await pool.connect();
  try {
    const bounds = monthBounds(month);
    const monthEnd = monthEndForAttendanceDate(bounds.startIso);

    const monthStatus = await getMonthCloseStatus(client, { monthEndIso: monthEnd });

    const employees = await listEmployeesForAttendance(client, { divisionId });
    const records = await listAttendanceRecordsForMonth(client, { startDate: bounds.startIso, endDate: bounds.endIso, divisionId });
    const todayDate = await getTodayDateOnly(client);

    return {
      month,
      startDate: bounds.startIso,
      endDate: bounds.endIso,
      monthStatus,
      todayDate,
      employees,
      records
    };
  } finally {
    client.release();
  }
}

export async function getAttendanceSummary(pool, { month, divisionId }) {
  const { startIso, endIso } = monthBounds(month);
  const monthEnd = monthEndForAttendanceDate(startIso);

  const client = await pool.connect();
  try {
    const monthStatus = await getMonthCloseStatus(client, { monthEndIso: monthEnd });

    const employees = await listEmployeesForAttendance(client, { divisionId });
    const employeeMap = new Map();
    for (const e of employees) {
      const joiningDate = (typeof e.created_at_date === 'string' && e.created_at_date) || null;
      employeeMap.set(e.id, {
        employeeId: e.id,
        employeeCode: e.employee_code,
        firstName: e.first_name,
        lastName: e.last_name,
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        totalMarkedDays: 0,
        joiningDate
      });
    }

    const records = await listAttendanceRecordsForMonth(client, { startDate: startIso, endDate: endIso, divisionId });
    if ((records || []).length === 0) {
      const workingDays = countWorkingDays({ startIso, endIso });
      return {
        month,
        startDate: startIso,
        endDate: endIso,
        monthStatus,
        workingDays,
        rows: []
      };
    }

    for (const r of records) {
      const row = employeeMap.get(r.employee_id);
      if (!row) continue;
      if (row.joiningDate && typeof r.attendance_date === 'string' && r.attendance_date < row.joiningDate) continue;
      if (r.status === 'PRESENT') row.presentDays += 1;
      if (r.status === 'ABSENT') row.absentDays += 1;
      if (r.status === 'LEAVE') row.leaveDays += 1;
      row.totalMarkedDays += 1;
    }

    const workingDays = countWorkingDays({ startIso, endIso });

    return {
      month,
      startDate: startIso,
      endDate: endIso,
      monthStatus,
      workingDays,
      rows: Array.from(employeeMap.values()).sort((a, b) => String(a.employeeCode).localeCompare(String(b.employeeCode)))
    };
  } finally {
    client.release();
  }
}
