import crypto from 'node:crypto';

import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { conflict } from '../../../../shared/kernel/errors.js';

import {
  getAttendanceRecordByEmployeeDate,
  insertAttendanceRecord,
  updateAttendanceRecord
} from '../../../attendance/repository/attendanceRepository.js';

function makeLeaveNote({ leaveRequestId, part }) {
  const p = part ? String(part).toUpperCase() : null;
  return p ? `LEAVE_REQUEST:${leaveRequestId}:${p}` : `LEAVE_REQUEST:${leaveRequestId}`;
}

export async function applyLeaveToAttendance(client, { employeeId, dateIso, leaveRequestId, halfDayPart, actorId, requestId }) {
  const note = makeLeaveNote({ leaveRequestId, part: halfDayPart });
  const existing = await getAttendanceRecordByEmployeeDate(client, { employeeId, attendanceDate: dateIso });

  if (!existing) {
    const inserted = await insertAttendanceRecord(client, {
      id: crypto.randomUUID(),
      employee_id: employeeId,
      attendance_date: dateIso,
      status: 'LEAVE',
      source: 'SYSTEM',
      note,
      marked_by: actorId,
      version: 1
    });

    if (!inserted) throw conflict('Attendance already exists');

    await writeAuditLog(client, {
      requestId,
      entityType: 'ATTENDANCE',
      entityId: inserted.id,
      action: 'ATTENDANCE_SYNC_APPLIED',
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

    return inserted;
  }

  const updated = await updateAttendanceRecord(client, {
    id: existing.id,
    status: 'LEAVE',
    source: 'SYSTEM',
    note,
    markedBy: actorId
  });

  await writeAuditLog(client, {
    requestId,
    entityType: 'ATTENDANCE',
    entityId: updated.id,
    action: 'ATTENDANCE_SYNC_APPLIED',
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
    reason: null
  });

  return updated;
}

export async function revertLeaveInAttendance(client, { employeeId, dateIso, leaveRequestId, actorId, requestId }) {
  const existing = await getAttendanceRecordByEmployeeDate(client, { employeeId, attendanceDate: dateIso });
  if (!existing) return null;

  const notePrefix = `LEAVE_REQUEST:${leaveRequestId}`;
  if (existing.source !== 'SYSTEM' || !String(existing.note || '').startsWith(notePrefix)) {
    return null;
  }

  const updated = await updateAttendanceRecord(client, {
    id: existing.id,
    status: 'ABSENT',
    source: 'SYSTEM',
    note: `REVERTED_LEAVE_REQUEST:${leaveRequestId}`,
    markedBy: actorId
  });

  await writeAuditLog(client, {
    requestId,
    entityType: 'ATTENDANCE',
    entityId: updated.id,
    action: 'ATTENDANCE_SYNC_REVERTED',
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
    reason: null
  });

  return updated;
}
