import { getLeaveRequestById } from '../../infrastructure/persistence/leaveRequest.repository.pg.js';

export async function getLeaveRequestByIdUsecase(pool, { id, actorId, requestId }) {
  const query = `
    SELECT 
      lr.id,
      lr.employee_id as "employeeId",
      e.employee_code as "employeeCode",
      e.first_name as "firstName",
      e.last_name as "lastName",
      lr.leave_type_id as "leaveTypeId",
      lt.code as "leaveTypeCode",
      lt.name as "leaveTypeName",
      lr.start_date as "startDate",
      lr.end_date as "endDate",
      lr.unit,
      lr.units,
      lr.reason,
      lr.status,
      lr.approved_l1_by as "approvedL1By",
      lr.approved_l1_at as "approvedL1At",
      lr.approved_l2_by as "approvedL2By",
      lr.approved_l2_at as "approvedL2At",
      lr.rejected_by as "rejectedBy",
      lr.rejected_at as "rejectedAt",
      lr.version,
      lr.created_at as "createdAt",
      lr.updated_at as "updatedAt"
    FROM leave_request lr
    LEFT JOIN employee e ON lr.employee_id = e.id
    LEFT JOIN leave_type lt ON lr.leave_type_id = lt.id
    WHERE lr.id = $1
  `;
  
  const result = await pool.query(query, [id]);
  
  if (!result.rows[0]) {
    return null;
  }
  
  return result.rows[0];
}
