export function toAttendanceSummaryDto({ month, startDate, endDate, monthStatus, workingDays, rows }) {
  return {
    month,
    startDate,
    endDate,
    monthStatus,
    isMonthClosed: monthStatus === 'CLOSED',
    workingDays,
    items: (rows || []).map((r) => ({
      employeeId: r.employeeId,
      employeeCode: r.employeeCode,
      firstName: r.firstName,
      lastName: r.lastName,
      presentDays: r.presentDays,
      absentDays: r.absentDays,
      leaveDays: r.leaveDays,
      totalMarkedDays: r.totalMarkedDays,
      totalWorkingDays: workingDays
    }))
  };
}
