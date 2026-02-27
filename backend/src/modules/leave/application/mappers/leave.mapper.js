export function toLeaveTypeDto(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isPaid: row.is_paid,
    supportsHalfDay: row.supports_half_day,
    affectsPayroll: row.affects_payroll,
    deductionRule: row.deduction_rule,
    isActive: row.is_active,
    version: row.version,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by
  };
}

export function toLeaveBalanceDto(row) {
  return {
    id: row.id,
    employee: {
      id: row.employee_id,
      code: row.employee_code,
      name: `${row.first_name} ${row.last_name}`.trim()
    },
    leaveType: {
      code: row.leave_type_code,
      name: row.leave_type_name
    },
    year: row.year,
    grantedBalance: Number(row.granted_balance || 0),
    consumedBalance: Number(row.consumed_balance || 0),
    availableBalance: Number(row.available_balance || 0),
    reason: row.reason,
    updatedAt: row.updated_at
  };
}

export function toLeaveRequestDto(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    primaryDivisionId: row.primary_division_id,
    leaveTypeId: row.leave_type_id,
    leaveTypeCode: row.leave_type_code,
    leaveTypeName: row.leave_type_name,
    leaveTypeIsPaid: row.leave_type_is_paid,
    startDate: row.start_date,
    endDate: row.end_date,
    unit: row.unit,
    halfDayPart: row.half_day_part,
    units: Number(row.units || 0),
    reason: row.reason,
    status: row.status,
    approvedL1By: row.approved_l1_by,
    approvedL1At: row.approved_l1_at,
    approvedL2By: row.approved_l2_by,
    approvedL2At: row.approved_l2_at,
    rejectedBy: row.rejected_by,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason,
    cancelledBy: row.cancelled_by,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toLeaveAttachmentDto(row) {
  return {
    id: row.id,
    leaveRequestId: row.leave_request_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storageKey: row.storage_key,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by
  };
}
