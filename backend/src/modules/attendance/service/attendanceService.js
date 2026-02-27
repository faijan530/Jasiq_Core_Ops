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
  // Ensure actorPermissions is an array
  const permissions = Array.isArray(actorPermissions) ? actorPermissions : [];
  
  // SYSTEM_FULL_ACCESS bypasses all permission checks
  if (permissions.includes('SYSTEM_FULL_ACCESS')) {
    return true;
  }
  
  return permissions.includes(code);
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
  if (status === 'CLOSED') throw badRequest('Attendance for this month is locked.');
  return status;
}

async function isSelfMarkEnabled(pool) {
  const value = await getSystemConfigValue(pool, 'ATTENDANCE_SELF_MARK_ENABLED');
  if (value === null) return false;
  const v = String(value).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'enabled';
}

async function getEmployeeIdFromUserId(client, userId) {
  console.info('[attendance.getEmployeeIdFromUserId] looking up employee for user', { userId });
  
  const res = await client.query(
    `SELECT employee_id FROM "user" WHERE id = $1`,
    [userId]
  );
  
  const employeeId = res.rows[0]?.employee_id;
  console.info('[attendance.getEmployeeIdFromUserId] lookup result', { 
    userId, 
    employeeId, 
    found: !!employeeId 
  });
  
  return employeeId;
}

export async function markAttendance(pool, { employeeId, attendanceDate, status, source, note, reason, actorId, requestId, actorPermissions }) {
  console.info('[attendance.mark] service entry', { 
    employeeId, 
    attendanceDate, 
    status, 
    source, 
    actorId, 
    actorPermissions, 
    requestId 
  });
  
  // If employeeId is actually a userId, lookup the real employeeId
  let actualEmployeeId = employeeId;
  
  // For self-marking, always resolve employeeId from userId
  if (String(source || '').toUpperCase() === 'SELF') {
    return withTransaction(pool, async (client) => {
      const resolvedEmployeeId = await getEmployeeIdFromUserId(client, actorId);
      if (!resolvedEmployeeId) {
        throw notFound('Employee not found for user');
      }
      
      console.info('[attendance.mark] resolved employeeId for self-marking', { 
        userId: actorId, 
        resolvedEmployeeId, 
        requestId 
      });
      
      actualEmployeeId = resolvedEmployeeId;
      
      // Continue with the resolved employee ID
      return markAttendanceWithEmployeeId(pool, { 
        employeeId: actualEmployeeId, 
        attendanceDate, 
        status, 
        source, 
        note, 
        reason, 
        actorId, 
        requestId, 
        actorPermissions 
      });
    });
  }
  
  // For non-self-marking, check if employeeId needs resolution
  if (employeeId === actorId) {
    // This is a self-marking scenario, employeeId might be userId
    return withTransaction(pool, async (client) => {
      const resolvedEmployeeId = await getEmployeeIdFromUserId(client, actorId);
      if (!resolvedEmployeeId) {
        throw notFound('Employee not found for user');
      }
      
      console.info('[attendance.mark] resolved employeeId', { 
        userId: actorId, 
        resolvedEmployeeId, 
        requestId 
      });
      
      actualEmployeeId = resolvedEmployeeId;
      
      // Continue with the resolved employee ID
      return markAttendanceWithEmployeeId(pool, { 
        employeeId: actualEmployeeId, 
        attendanceDate, 
        status, 
        source, 
        note, 
        reason, 
        actorId, 
        requestId, 
        actorPermissions 
      });
    });
  }
  
  // Continue with original flow for non-self-marking
  return markAttendanceWithEmployeeId(pool, { 
    employeeId: actualEmployeeId, 
    attendanceDate, 
    status, 
    source, 
    note, 
    reason, 
    actorId, 
    requestId, 
    actorPermissions 
  });
}

async function markAttendanceWithEmployeeId(pool, { employeeId, attendanceDate, status, source, note, reason, actorId, requestId, actorPermissions }) {
  console.info('[attendance.mark] withEmployeeId entry', { 
    employeeId, 
    attendanceDate, 
    status, 
    source, 
    actorId, 
    requestId 
  });
  
    // Allow self-marking with ATTENDANCE_MARK_SELF permission, otherwise require ATTENDANCE_WRITE
  const isSelfMark = String(source).toUpperCase() === 'SELF';
  const requiredPermission = isSelfMark ? 'ATTENDANCE_MARK_SELF' : 'ATTENDANCE_WRITE';
  
  console.info('[attendance.mark] permission check', { 
    isSelfMark, 
    requiredPermission, 
    actorPermissions, 
    hasPermission: hasPermission(actorPermissions, requiredPermission),
    requestId 
  });
  
  if (!hasPermission(actorPermissions, requiredPermission)) {
    console.warn('[attendance.mark] permission denied', { 
      requiredPermission, 
      actorPermissions, 
      requestId 
    });
    throw forbidden();
  }

  assertAttendanceStatus(status);
  assertAttendanceSource(source);

  const attendanceDateIso = normalizeAttendanceDate(attendanceDate);

  const selfEnabled = await isSelfMarkEnabled(pool);
  assertSelfMarkingAllowed({ actorId, employeeId, source, selfMarkEnabled: selfEnabled });

  return withTransaction(pool, async (client) => {
    const todayDate = await getTodayDateOnly(client);
    
    console.info('[attendance.mark] date validation', { 
      attendanceDate: attendanceDateIso, 
      todayDate, 
      isSelfMark, 
      requestId 
    });
    
    // For self-marking, only allow today's date
    if (isSelfMark) {
      if (attendanceDateIso !== todayDate) {
        if (attendanceDateIso < todayDate) {
          console.warn('[attendance.mark] past date rejected', { 
            attendanceDate: attendanceDateIso, 
            todayDate, 
            requestId 
          });
          throw badRequest('Past dates are not allowed for self-marking');
        } else {
          console.warn('[attendance.mark] future date rejected', { 
            attendanceDate: attendanceDateIso, 
            todayDate, 
            requestId 
          });
          throw badRequest('Future dates are not allowed for self-marking');
        }
      }
    } else {
      // For admin/HR marking, allow past dates with override permission
      if (attendanceDateIso < todayDate) {
        const canOverride = 
          actorPermissions.includes('ATTENDANCE_OVERRIDE') ||
          actorPermissions.includes('SYSTEM_FULL_ACCESS');
        
        if (!canOverride) {
          throw badRequest('Past dates are not allowed');
        }
      }
    }
    
    if (attendanceDateIso > todayDate) {
      throw badRequest('Future dates are not allowed');
    }

    await assertActorCanAccessEmployee(client, { actorId, permissionCode: requiredPermission, employeeId });

    const employee = await getEmployeeForAttendance(client, employeeId);
    assertEmployeeActive(employee);
    assertWithinEmploymentPeriod(employee, attendanceDateIso);

    const monthStatus = await assertMonthOpenForAttendance(client, attendanceDateIso);

    const existing = await getAttendanceRecordByEmployeeDate(client, { employeeId, attendanceDate: attendanceDateIso });
    console.info('[attendance.mark] checking existing record', { 
      existing: !!existing, 
      employeeId, 
      attendanceDate: attendanceDateIso, 
      existingId: existing?.id,
      requestId 
    });
    
    if (existing) {
      console.info('[attendance.mark] existing record found', { 
        existingId: existing.id, 
        existingStatus: existing.status, 
        existingDate: existing.attendance_date,
        employeeId: existing.employee_id,
        requestId 
      });
      
      // For self-marking, allow updating the same day's attendance without override permission
      if (isSelfMark && attendanceDateIso === todayDate) {
        console.info('[attendance.mark] allowing self-update for today', { 
          existingId: existing.id, 
          attendanceDate: attendanceDateIso, 
          requestId 
        });
        
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
          action: 'UPDATE',
          beforeData: {
            employee_id: existing.employee_id,
            attendance_date: existing.attendance_date,
            status: existing.status,
            source: existing.source,
            note: existing.note
          },
          afterData: {
            employee_id: updated.employee_id,
            attendance_date: updated.attendance_date,
            status: updated.status,
            source: updated.source,
            note: updated.note
          },
          actorId,
          actorRole: null,
          reason: 'Self-marking update'
        });

        return { row: updated, monthStatus };
      }
      
      // For other cases (past dates or non-self-marking), require override permission
      if (!hasPermission(actorPermissions, 'ATTENDANCE_OVERRIDE')) {
        console.warn('[attendance.mark] override permission missing', { 
          actorPermissions, 
          requiredPermission: 'ATTENDANCE_OVERRIDE',
          requestId 
        });
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

    console.info('[attendance.mark] inserting new record', { employeeId, attendanceDate: attendanceDateIso, status, source, requestId });
    const inserted = await insertAttendanceRecord(client, {
      employee_id: employeeId,
      attendance_date: attendanceDateIso,
      status: String(status).toUpperCase(),
      source: String(source).toUpperCase(),
      note: note ? String(note).trim() : null,
      marked_by: actorId
    });

    console.info('[attendance.mark] insert result', { inserted: !!inserted, insertedId: inserted?.id, requestId });

    if (!inserted) {
      console.warn('[attendance.mark] insert returned null, checking for conflict', { employeeId, attendanceDate: attendanceDateIso, requestId });
      const conflict = await getAttendanceRecordByEmployeeDate(client, { employeeId, attendanceDate: attendanceDateIso });
      if (conflict) {
        console.warn('[attendance.mark] conflict detected after insert failure', { conflictId: conflict.id, requestId });
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

export async function overrideAttendance(pool, { employeeId, attendanceDate, newStatus, reason, actorId, requestId, actorPermissions }) {
  // Ensure actorPermissions is an array
  const permissions = Array.isArray(actorPermissions) ? actorPermissions : [];
  
  console.info('[attendance.override] checking permissions', { 
    actorPermissions: permissions, 
    hasAttendanceCorrect: permissions.includes('ATTENDANCE_CORRECT'),
    hasAttendanceWrite: permissions.includes('ATTENDANCE_WRITE'),
    hasSystemFullAccess: permissions.includes('SYSTEM_FULL_ACCESS')
  });
  
  // Accept ATTENDANCE_CORRECT or ATTENDANCE_WRITE for override
  if (!hasPermission(permissions, 'ATTENDANCE_CORRECT') && 
      !hasPermission(permissions, 'ATTENDANCE_WRITE') && 
      !hasPermission(permissions, 'SYSTEM_FULL_ACCESS')) {
    console.error('[attendance.override] permission check failed');
    throw forbidden();
  }

  console.info('[attendance.override] permission check passed');

  // Validate status
  assertAttendanceStatus(newStatus);

  // Add defensive guard
  if (!newStatus) {
    throw new Error("New attendance status is required");
  }

  // Use fixed source for HR override
  const source = 'MANUAL';

  // Ensure uppercase before DB write
  const normalizedStatus = newStatus.toUpperCase();

  const attendanceDateIso = normalizeAttendanceDate(attendanceDate);

  // Reason is optional for HR override
  const trimmedReason = String(reason || '').trim();

  return withTransaction(pool, async (client) => {
    const todayDate = await getTodayDateOnly(client);
    
    // Check future date restriction
    if (attendanceDateIso > todayDate) {
      throw badRequest('Cannot mark attendance for future date.');
    }

    // Check month close status for the specific month
    const month = attendanceDateIso.substring(0, 7); // Extract month from attendance date
    console.log('[attendance.override] month validation debug', {
      attendanceDate: attendanceDateIso,
      derivedMonth: month
    });
    
    const monthEndIso = monthEndForAttendanceDate(attendanceDateIso);
    const monthStatus = await getMonthCloseStatus(client, { monthEndIso });
    console.log('[attendance.override] month validation debug', {
      monthStatusFromDB: monthStatus
    });
    
    if (monthStatus === 'CLOSED') {
      throw badRequest('Attendance cannot be dealt?. Month is closed.');
    }

    await assertActorCanAccessEmployee(client, { actorId, permissionCode: 'ATTENDANCE_CORRECT', employeeId });

    const employee = await getEmployeeForAttendance(client, employeeId);
    assertEmployeeActive(employee);
    assertWithinEmploymentPeriod(employee, attendanceDateIso);

    const existing = await getAttendanceRecordByEmployeeDate(client, { employeeId, attendanceDate: attendanceDateIso });
    
    let before = null;
    let updated;
    
    if (existing) {
      // CASE 1: Record exists - UPDATE it
      before = {
        employee_id: existing.employee_id,
        attendance_date: existing.attendance_date,
        status: existing.status,
        source: existing.source,
        note: existing.note
      };

      updated = await updateAttendanceRecord(client, {
        id: existing.id,
        status: normalizedStatus,
        source: String(source).toUpperCase(),
        note: trimmedReason ? String(trimmedReason).trim() : null,
        markedBy: actorId
      });
    } else {
      // CASE 2: Record does not exist - INSERT it
      before = null;
      
      updated = await insertAttendanceRecord(client, {
        employee_id: employeeId,
        attendance_date: attendanceDateIso,
        status: normalizedStatus,
        source: String(source).toUpperCase(),
        note: trimmedReason ? String(trimmedReason).trim() : null,
        marked_by: actorId
      });
    }

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
  if (!hasPermission(actorPermissions, 'ATTENDANCE_BULK_WRITE') && 
      !hasPermission(actorPermissions, 'ATTENDANCE_WRITE') && 
      !hasPermission(actorPermissions, 'SYSTEM_FULL_ACCESS')) {
    throw forbidden();
  }

  assertAttendanceSource(source);

  const attendanceDateIso = normalizeAttendanceDate(attendanceDate);

  const selfEnabled = await isSelfMarkEnabled(pool);

  return withTransaction(pool, async (client) => {
    const todayDate = await getTodayDateOnly(client);
    
    // Fix PROBLEM 1: Allow past dates with override permission
    if (attendanceDateIso < todayDate) {
      const canOverride = 
        actorPermissions.includes('ATTENDANCE_OVERRIDE') ||
        actorPermissions.includes('SYSTEM_FULL_ACCESS');
      
      if (!canOverride) {
        throw badRequest('Past dates are not allowed');
      }
    }
    
    if (attendanceDateIso > todayDate) {
      throw badRequest('Future dates are not allowed');
    }

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
            throw badRequest('Bulk attendance failed: Override permission required for employee ' + employeeId);
          }

          const trimmedReason = String(item.reason || '').trim();
          if (!trimmedReason) {
            throw badRequest('Bulk attendance failed: Reason is required for override for employee ' + employeeId);
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

        // Fix PROBLEM 2: Use proper UPSERT instead of ON CONFLICT DO NOTHING
        const res = await client.query(
          `INSERT INTO attendance_record (
            employee_id, attendance_date,
            status, source, note,
            marked_by, marked_at,
            created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW(),NOW())
          ON CONFLICT (employee_id, attendance_date)
          DO UPDATE SET
            status = EXCLUDED.status,
            source = EXCLUDED.source,
            marked_by = EXCLUDED.marked_by,
            marked_at = NOW(),
            updated_at = NOW(),
            note = EXCLUDED.note,
            version = attendance_record.version + 1
          RETURNING
            id, employee_id, attendance_date, status, source, note,
            marked_by, marked_at, created_at, updated_at, version`,
          [
            employeeId,
            attendanceDateIso,
            String(item.status).toUpperCase(),
            String(source).toUpperCase(), // Fix PROBLEM 3: Ensure source is normalized
            item.note ? String(item.note).trim() : null,
            actorId
          ]
        );
        
        const inserted = res.rows[0];

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
        // Atomic behavior: throw error to rollback entire transaction
        throw badRequest("Bulk attendance failed: " + (err?.message || 'Unknown error for employee ' + item.employeeId));
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

export async function getTeamAttendanceByWeek(pool, { managerId, managerUserId, week, requestId }) {
  const client = await pool.connect();
  try {
    // Get employees reporting to this manager
    let employeesResult = await client.query(
      `SELECT e.id, e.first_name, e.last_name, e.employee_code 
       FROM employee e 
       WHERE (
         ($1::uuid IS NOT NULL AND e.reporting_manager_id = $1)
         OR e.reporting_manager_id = $2
       )
       AND e.status = 'ACTIVE'`,
      [managerId, managerUserId]
    );

    if ((employeesResult.rows || []).length === 0) {
      // Fallback: if reporting lines are not configured, return all ACTIVE employees
      employeesResult = await client.query(
        `SELECT e.id, e.first_name, e.last_name, e.employee_code
         FROM employee e
         WHERE e.status = 'ACTIVE'
         ORDER BY e.first_name ASC, e.last_name ASC`
      );
    }

    const employees = employeesResult.rows;

    const employeeIds = employees.map(e => e.id);
    const employeeMap = new Map(employees.map(e => [e.id, e]));

    // Get start and end of week
    const weekDate = new Date(week + 'T00:00:00.000Z');
    const startOfWeek = new Date(weekDate);
    startOfWeek.setDate(weekDate.getDate() - weekDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = endOfWeek.toISOString().split('T')[0];

    // Fetch attendance for team employees in the week
    // NOTE: canonical table is attendance_record
    const attendanceResult = await client.query(
      `SELECT
         ar.employee_id,
         to_char(ar.attendance_date, 'YYYY-MM-DD') AS attendance_date,
         ar.status,
         ar.source,
         ar.note
       FROM attendance_record ar
       WHERE ar.employee_id = ANY($1)
         AND ar.attendance_date BETWEEN $2 AND $3
       ORDER BY ar.attendance_date, ar.employee_id`,
      [employeeIds, startDate, endDate]
    );

    const records = [];
    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    for (const attendance of attendanceResult.rows) {
      const employee = employeeMap.get(attendance.employee_id);
      if (!employee) continue;

      const record = {
        employeeId: attendance.employee_id,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        date: attendance.attendance_date,
        status: attendance.status,
        source: attendance.source,
        note: attendance.note
      };

      records.push(record);

      if (attendance.status === 'PRESENT') {
        presentCount++;
      } else if (attendance.status === 'ABSENT') {
        absentCount++;
      } else if (attendance.status === 'LEAVE') {
        leaveCount++;
      }
    }

    return {
      week,
      startDate,
      endDate,
      employees: employees.map((e) => ({
        id: e.id,
        employeeCode: e.employee_code,
        firstName: e.first_name,
        lastName: e.last_name,
        employeeName: `${e.first_name} ${e.last_name}`
      })),
      summary: {
        totalEmployees: employees.length,
        presentCount,
        absentCount,
        leaveCount
      },
      records
    };

  } finally {
    client.release();
  }
}

export async function getTeamAttendanceByMonth(pool, { managerId, managerUserId, month, requestId }) {
  const client = await pool.connect();
  try {
    // Get employees reporting to this manager
    let employeesResult = await client.query(
      `SELECT e.id, e.first_name, e.last_name, e.employee_code 
       FROM employee e 
       WHERE (
         ($1::uuid IS NOT NULL AND e.reporting_manager_id = $1)
         OR e.reporting_manager_id = $2
       )
       AND e.status = 'ACTIVE'`,
      [managerId, managerUserId]
    );

    if ((employeesResult.rows || []).length === 0) {
      // Fallback: if reporting lines are not configured, return all ACTIVE employees
      employeesResult = await client.query(
        `SELECT e.id, e.first_name, e.last_name, e.employee_code
         FROM employee e
         WHERE e.status = 'ACTIVE'
         ORDER BY e.first_name ASC, e.last_name ASC`
      );
    }

    const employees = employeesResult.rows;

    const employeeIds = employees.map(e => e.id);
    const employeeMap = new Map(employees.map(e => [e.id, e]));

    const { startIso: startDate, endIso: endDate } = monthBounds(month);

    // Fetch attendance for team employees in the month
    // NOTE: canonical table is attendance_record
    const attendanceResult = await client.query(
      `SELECT
         ar.employee_id,
         to_char(ar.attendance_date, 'YYYY-MM-DD') AS attendance_date,
         ar.status,
         ar.source,
         ar.note
       FROM attendance_record ar
       WHERE ar.employee_id = ANY($1)
         AND ar.attendance_date BETWEEN $2 AND $3
       ORDER BY ar.attendance_date, ar.employee_id`,
      [employeeIds, startDate, endDate]
    );

    const items = [];
    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    for (const attendance of attendanceResult.rows) {
      const employee = employeeMap.get(attendance.employee_id);
      if (!employee) continue;

      const record = {
        id: `${attendance.employee_id}-${attendance.attendance_date}`,
        employeeId: attendance.employee_id,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        attendanceDate: attendance.attendance_date,
        status: attendance.status,
        source: attendance.source,
        note: attendance.note,
        markedBy: null,
        markedAt: null
      };

      items.push(record);

      if (attendance.status === 'PRESENT') {
        presentCount++;
      } else if (attendance.status === 'ABSENT') {
        absentCount++;
      } else if (attendance.status === 'LEAVE') {
        leaveCount++;
      }
    }

    return {
      month,
      startDate,
      endDate,
      employees: employees.map((e) => ({
        id: e.id,
        employeeCode: e.employee_code,
        firstName: e.first_name,
        lastName: e.last_name,
        employeeName: `${e.first_name} ${e.last_name}`
      })),
      summary: {
        totalEmployees: employees.length,
        presentCount,
        absentCount,
        leaveCount
      },
      items
    };
  } finally {
    client.release();
  }
};
