import { badRequest } from '../../../shared/kernel/errors.js';

export function assertEmployeeScope({ scope, primaryDivisionId }) {
  if (scope !== 'COMPANY' && scope !== 'DIVISION') {
    throw badRequest('Invalid scope');
  }

  if (scope === 'DIVISION' && !primaryDivisionId) {
    throw badRequest('primaryDivisionId is required for DIVISION scope');
  }

  if (scope === 'COMPANY' && primaryDivisionId) {
    throw badRequest('primaryDivisionId must be null for COMPANY scope');
  }
}

export function assertStatusTransition(fromStatus, toStatus) {
  if (toStatus !== 'ACTIVE' && toStatus !== 'ON_HOLD' && toStatus !== 'EXITED') {
    throw badRequest('Invalid status');
  }

  if (fromStatus === toStatus) return;

  if (fromStatus === 'EXITED') {
    throw badRequest('Cannot change status after EXITED');
  }
}

export function assertNotExited(employee) {
  if (employee.status === 'EXITED') {
    throw badRequest('Employee is EXITED');
  }
}

export function toEmployeeDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    scope: row.scope,
    primaryDivisionId: row.primary_division_id,
    compensationType: row.compensation_type || null,
    compensationAmount: row.compensation_amount ? Number(row.compensation_amount) : null,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    version: row.version
  };
}

export function toEmployeeScopeHistoryDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.employee_id,
    scope: row.scope,
    primaryDivisionId: row.primary_division_id,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    reason: row.reason,
    changedAt: row.changed_at,
    changedBy: row.changed_by
  };
}

export function toEmployeeCompensationDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.employee_id,
    amount: row.amount,
    currency: row.currency,
    frequency: row.frequency,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    reason: row.reason,
    createdAt: row.created_at,
    createdBy: row.created_by
  };
}

export function toEmployeeDocumentDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.employee_id,
    documentType: row.document_type,
    fileName: row.file_name,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    isActive: row.is_active,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by,
    deactivatedAt: row.deactivated_at,
    deactivatedBy: row.deactivated_by,
    deactivatedReason: row.deactivated_reason
  };
}
