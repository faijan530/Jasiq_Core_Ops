import crypto from 'node:crypto';

import { badRequest } from '../../../shared/kernel/errors.js';

import { insertPayrollItem } from '../repositories/payrollItem.repository.js';

function toDateOnlyIso(value) {
  if (!value) return '';

  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const raw = String(value).trim();
  if (!raw) return '';

  if (raw.includes('T')) {
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  return raw.slice(0, 10);
}

function monthEndIso(dateIso) {
  const dateOnly = toDateOnlyIso(dateIso);
  const d = new Date(`${String(dateOnly).slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return end.toISOString().slice(0, 10);
}

function monthEndAsOfTimestamp(monthIso) {
  const dateOnly = toDateOnlyIso(monthIso);
  const d = new Date(`${String(dateOnly).slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return end;
}

async function selectCompensationVersionStrict(client, { employeeId, asOfDateIso }) {
  const res = await client.query(
    `SELECT id, amount, frequency, effective_from, effective_to
     FROM employee_compensation_version
     WHERE employee_id = $1
       AND effective_from <= $2::date
       AND (effective_to IS NULL OR effective_to >= $2::date)
     ORDER BY effective_from DESC, id DESC`,
    [employeeId, asOfDateIso]
  );

  const rows = res.rows || [];
  if (rows.length === 0) return null;
  if (rows.length > 1) {
    throw badRequest('Multiple active compensation versions found for employee', {
      employeeId,
      asOfDate: asOfDateIso
    });
  }

  return rows[0];
}

async function resolveDivisionFromScopeHistory(client, { employeeId, asOfTs }) {
  const res = await client.query(
    `SELECT scope, primary_division_id
     FROM employee_scope_history
     WHERE employee_id = $1
       AND effective_from <= $2
       AND (effective_to IS NULL OR effective_to > $2)
     ORDER BY effective_from DESC, id DESC
     LIMIT 1`,
    [employeeId, asOfTs]
  );

  const row = res.rows[0] || null;
  if (!row) return null;

  const scope = String(row.scope || '').toUpperCase();
  const divisionId = row.primary_division_id || null;

  if (scope === 'COMPANY') return null;
  if (scope === 'DIVISION') {
    if (!divisionId) {
      throw badRequest('Division scope history missing primary_division_id', { employeeId });
    }
    return divisionId;
  }

  return divisionId;
}

async function divisionExists(client, { divisionId }) {
  if (!divisionId) return false;
  const res = await client.query('SELECT 1 FROM division WHERE id = $1', [divisionId]);
  return (res.rows || []).length > 0;
}

export async function computeBasePayItems(client, {
  payrollRunId,
  month,
  actorId
}) {
  const monthEnd = monthEndIso(month);
  const asOfTs = monthEndAsOfTimestamp(monthEnd);

  const resEmp = await client.query(
    `SELECT id
     FROM employee
     WHERE status = 'ACTIVE'
     ORDER BY id ASC`,
    []
  );

  const employees = resEmp.rows || [];
  let createdCount = 0;

  for (const emp of employees) {
    const employeeId = emp.id;

    const comp = await selectCompensationVersionStrict(client, { employeeId, asOfDateIso: monthEnd });
    if (!comp) continue;

    const freq = String(comp.frequency || '').toUpperCase();
    let monthly = Number(comp.amount || 0);
    if (freq === 'ANNUAL') monthly = monthly / 12;
    else if (freq === 'MONTHLY') monthly = monthly;
    else {
      throw badRequest('Unsupported compensation frequency for payroll compute', {
        employeeId,
        frequency: freq
      });
    }

    let divisionId = await resolveDivisionFromScopeHistory(client, { employeeId, asOfTs });
    if (divisionId && !(await divisionExists(client, { divisionId }))) {
      divisionId = null;
    }

    const inserted = await insertPayrollItem(client, {
      id: crypto.randomUUID(),
      payroll_run_id: payrollRunId,
      employee_id: employeeId,
      item_type: 'BASE_PAY',
      description: 'Base Pay',
      amount: monthly,
      division_id: divisionId,
      is_system_generated: true,
      created_by: actorId
    });

    if (inserted) createdCount += 1;
  }

  return { createdCount, monthEnd };
}
