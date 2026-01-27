function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDateOnlyString(value) {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  return value.slice(0, 10);
}

export function toAttendanceMonthDto({ month, startDate, endDate, monthStatus, todayDate, employees, records }) {
  return {
    month,
    startDate,
    endDate,
    monthStatus,
    isMonthClosed: monthStatus === 'CLOSED',
    todayDate: todayDate || null,
    employees: (employees || []).map((e) => ({
      id: e.id,
      employeeCode: e.employee_code,
      firstName: e.first_name,
      lastName: e.last_name,
      email: e.email,
      status: e.status,
      scope: e.scope,
      primaryDivisionId: e.primary_division_id
    })),
    records: (records || []).map((r) => ({
      id: r.id,
      employeeId: r.employee_id,
      attendanceDate: toDateOnlyString(r.attendance_date),
      status: r.status,
      source: r.source,
      note: r.note,
      markedBy: r.marked_by,
      markedAt: r.marked_at,
      updatedAt: r.updated_at
    }))
  };
}

export function toAttendanceWriteResultDto(row) {
  if (!row) return { item: null };
  return {
    item: {
      id: row.id,
      employeeId: row.employee_id,
      attendanceDate: toDateOnlyString(row.attendance_date),
      status: row.status,
      source: row.source,
      note: row.note,
      markedBy: row.marked_by,
      markedAt: row.marked_at,
      updatedAt: row.updated_at
    }
  };
}

export function toAttendanceBulkResultDto({ results }) {
  return {
    items: (results || []).map((r) => ({
      employeeId: r.employeeId,
      attendanceDate: r.attendanceDate,
      status: r.status,
      outcome: r.outcome,
      error: r.error || null
    }))
  };
}
