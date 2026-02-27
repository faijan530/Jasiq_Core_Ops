import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict, notFound } from '../../../../shared/kernel/errors.js';

import {
  closeActiveEmployeeScopeHistory,
  getActiveEmployeeScopeHistory,
  getEmployeeById,
  getUserByEmployeeId,
  getUserById,
  insertEmployeeScopeHistory,
  updateEmployeeScope,
  updateUserEmployeeId
} from '../../repository/employeeDiagnostic.repository.js';

export async function diagnoseEmployeeLinkage(pool, { userId }) {
  return withTransaction(pool, async (client) => {
    const issues = [];

    const user = await getUserById(client, { userId });
    const employeeId = user?.employee_id || null;

    if (!employeeId) {
      issues.push('USER_NOT_LINKED');
      return {
        userId,
        employeeLinked: false,
        employeeId: null,
        scope: null,
        primaryDivisionId: null,
        issues
      };
    }

    const employee = await getEmployeeById(client, { employeeId });
    if (!employee) {
      issues.push('USER_NOT_LINKED');
      return {
        userId,
        employeeLinked: false,
        employeeId: null,
        scope: null,
        primaryDivisionId: null,
        issues
      };
    }

    const active = await getActiveEmployeeScopeHistory(client, { employeeId });
    const scope = active?.scope || null;
    const primaryDivisionId = active?.primary_division_id || employee.primary_division_id || null;

    if (!active) {
      issues.push('NO_ACTIVE_SCOPE');
    } else {
      if (String(active.scope || '') !== 'DIVISION') {
        issues.push('NOT_DIVISION_SCOPE');
      }
      if (!active.primary_division_id) {
        issues.push('DIVISION_NOT_SET');
      }
    }

    return {
      userId,
      employeeLinked: true,
      employeeId: employee.id,
      scope,
      primaryDivisionId,
      issues
    };
  });
}

export async function linkEmployeeToUser(pool, { employeeId, userId, actorId, actorRole, requestId }) {
  return withTransaction(pool, async (client) => {
    const employee = await getEmployeeById(client, { employeeId });
    if (!employee) throw notFound('Employee not found');

    const user = await getUserById(client, { userId });
    if (!user) throw notFound('User not found');

    if (user.employee_id && String(user.employee_id) !== String(employeeId)) {
      throw conflict('User is already linked to another employee');
    }

    const existingUserForEmployee = await getUserByEmployeeId(client, { employeeId });
    if (existingUserForEmployee && String(existingUserForEmployee.id) !== String(userId)) {
      throw conflict('Employee is already linked to another user');
    }

    await updateUserEmployeeId(client, { userId, employeeId });

    await writeAuditLog(client, {
      requestId,
      entityType: 'EMPLOYEE',
      entityId: employeeId,
      action: 'EMPLOYEE_USER_LINKED',
      beforeData: { employeeId, userId: existingUserForEmployee?.id || null },
      afterData: { employeeId, userId },
      actorId,
      actorRole: actorRole || null,
      reason: 'Admin linked user to employee'
    });

    return {
      userId,
      employeeId
    };
  });
}

export async function fixEmployeeDivisionScope(pool, {
  employeeId,
  divisionId,
  actorId,
  actorRole,
  requestId,
  scopeHistoryId
}) {
  return withTransaction(pool, async (client) => {
    const employee = await getEmployeeById(client, { employeeId });
    if (!employee) throw notFound('Employee not found');

    const now = new Date();

    const beforeActive = await getActiveEmployeeScopeHistory(client, { employeeId });

    await closeActiveEmployeeScopeHistory(client, { employeeId, effectiveTo: now });

    await insertEmployeeScopeHistory(client, {
      id: scopeHistoryId,
      employee_id: employeeId,
      scope: 'DIVISION',
      primary_division_id: divisionId,
      effective_from: now,
      effective_to: null,
      reason: 'Admin scope fix',
      changed_at: now,
      changed_by: actorId
    });

    const after = await updateEmployeeScope(client, {
      employeeId,
      scope: 'DIVISION',
      primaryDivisionId: divisionId,
      actorId
    });

    if (!after) throw badRequest('Scope update failed');

    await writeAuditLog(client, {
      requestId,
      entityType: 'EMPLOYEE_SCOPE',
      entityId: employeeId,
      action: 'EMPLOYEE_SCOPE_UPDATED',
      beforeData: beforeActive
        ? {
            employeeId,
            scope: beforeActive.scope,
            primary_division_id: beforeActive.primary_division_id
          }
        : null,
      afterData: {
        employeeId,
        scope: 'DIVISION',
        primary_division_id: divisionId
      },
      actorId,
      actorRole: actorRole || null,
      reason: 'Admin fixed employee division scope'
    });

    return {
      employeeId,
      divisionId
    };
  });
}
