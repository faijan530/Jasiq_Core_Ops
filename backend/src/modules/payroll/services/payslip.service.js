import crypto from 'node:crypto';

import { withTransaction } from '../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../shared/kernel/audit.js';
import { badRequest, forbidden, notFound } from '../../../shared/kernel/errors.js';
import { getSystemConfigValue } from '../../../shared/kernel/systemConfig.js';

import { PAYROLL_RUN_STATUS } from '../models/payrollRun.model.js';

import { getPayrollRunById } from '../repositories/payroll.repository.js';
import { listEmployeesWithPayrollItems, listPayrollItemsByRunEmployee } from '../repositories/payrollItem.repository.js';
import {
  getEmployeeIdByUserId,
  getMaxPayslipSequenceForMonth,
  getPayslipById,
  insertPayslip,
  listPayslipsByRun
} from '../repositories/payslip.repository.js';
import { listPaymentsByRunEmployee } from '../repositories/payrollPayment.repository.js';

import { generatePayslipPdf } from '../infrastructure/pdf/payslipPdfGenerator.adapter.js';
import { storePayslip } from '../infrastructure/storage/payslipStorage.adapter.js';

function sumAmounts(items, predicate) {
  let total = 0;
  for (const it of items || []) {
    if (!predicate(it)) continue;
    total += Number(it?.amount || 0) || 0;
  }
  return total;
}

function computeTotals(items) {
  const gross = sumAmounts(items, (it) => {
    const t = String(it?.item_type || '').toUpperCase();
    return t === 'BASE_PAY' || t === 'ALLOWANCE' || t === 'BONUS';
  });
  const totalAdjustments = sumAmounts(items, (it) => String(it?.item_type || '').toUpperCase() === 'ADJUSTMENT');
  const totalDeductions = sumAmounts(items, (it) => String(it?.item_type || '').toUpperCase() === 'DEDUCTION');
  const net = gross + totalAdjustments - totalDeductions;
  return { gross, totalAdjustments, totalDeductions, net };
}

function computePaymentStatus({ net, payments }) {
  const paidTotal = (payments || []).reduce((s, p) => s + (Number(p?.paid_amount || 0) || 0), 0);
  if (paidTotal >= Number(net || 0)) return 'PAID';
  return 'UNPAID';
}

async function assertPayrollEnabled(pool) {
  const raw = await getSystemConfigValue(pool, 'PAYROLL_ENABLED');
  const v = String(raw ?? '').trim().toLowerCase();
  const enabled = v === 'true' || v === '1' || v === 'yes' || v === 'enabled' || v === 'on';
  if (!enabled) throw forbidden('Payroll is disabled');
}

async function getEmployeeInfo(client, { employeeId }) {
  const res = await client.query(
    `SELECT e.id,
            e.employee_code,
            e.first_name,
            e.last_name,
            d.name AS division_name
     FROM employee e
     LEFT JOIN division d ON d.id = e.primary_division_id
     WHERE e.id = $1`,
    [employeeId]
  );
  const row = res.rows[0] || null;
  if (!row) return null;
  return {
    id: row.id,
    employeeCode: row.employee_code,
    name: `${row.first_name} ${row.last_name}`.trim(),
    divisionName: row.division_name || null
  };
}

function monthStartIso(dateValue) {
  const d = new Date(String(dateValue || '').slice(0, 10));
  if (!Number.isFinite(d.getTime())) return null;
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  return m.toISOString().slice(0, 10);
}

function toYearMonth(dateValue) {
  const d = new Date(String(dateValue || '').slice(0, 10));
  if (!Number.isFinite(d.getTime())) return null;
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function groupSnapshotItems(items) {
  const earnings = [];
  const deductions = [];

  for (const it of items || []) {
    const t = String(it?.item_type || '').toUpperCase();
    const row = {
      type: t,
      description: String(it?.description || ''),
      amount: Number(it?.amount || 0) || 0
    };

    if (t === 'DEDUCTION') deductions.push(row);
    else earnings.push(row);
  }

  return { earnings, deductions };
}

export async function listPayslipsForRunService(pool, { id }) {
  await assertPayrollEnabled(pool);
  const run = await getPayrollRunById(pool, { id, forUpdate: false });
  if (!run) throw notFound('Payroll run not found');
  return await listPayslipsByRun(pool, { payrollRunId: id });
}

export async function generatePayslipsForRunService(pool, { id, actorId, requestId }) {
  await assertPayrollEnabled(pool);
  return withTransaction(pool, async (client) => {
    const run = await getPayrollRunById(client, { id, forUpdate: true });
    if (!run) throw notFound('Payroll run not found');

    const status = String(run.status || '').toUpperCase();
    if (status !== PAYROLL_RUN_STATUS.DRAFT) {
      throw badRequest('Payslip cannot be regenerated after lock/close.');
    }

    const runMonthIso = monthStartIso(run.month);
    if (runMonthIso) {
      const closedRes = await client.query(
        'SELECT status FROM month_close WHERE month = $1 AND scope = $2',
        [runMonthIso, 'COMPANY']
      );
      const closeStatus = closedRes.rows[0]?.status || 'OPEN';
      if (closeStatus === 'CLOSED') {
        throw badRequest('Payslip cannot be regenerated after lock/close.');
      }
    }

    const existingSlips = await listPayslipsByRun(client, { payrollRunId: run.id });
    if ((existingSlips || []).length > 0) {
      throw badRequest('Payslip cannot be regenerated after lock/close.');
    }

    const anyPaymentRes = await client.query('SELECT 1 FROM payroll_payment WHERE payroll_run_id = $1 LIMIT 1', [run.id]);
    if ((anyPaymentRes.rows || []).length > 0) {
      throw badRequest('Payslip cannot be regenerated after lock/close.');
    }

    const page = 1;
    const pageSize = 1000;
    const { employeeIds } = await listEmployeesWithPayrollItems(client, { payrollRunId: run.id, page, pageSize });

    const now = new Date();
    let created = 0;

    const ym = toYearMonth(run.month);
    if (!ym) throw badRequest('Invalid payroll month');

    let seq = (await getMaxPayslipSequenceForMonth(client, { year: ym.year, month: ym.month })) + 1;

    for (const employeeId of employeeIds) {
      const employee = await getEmployeeInfo(client, { employeeId });
      if (!employee) continue;

      const items = await listPayrollItemsByRunEmployee(client, { payrollRunId: run.id, employeeId });
      const payments = await listPaymentsByRunEmployee(client, { payrollRunId: run.id, employeeId });

      if ((payments || []).length > 0) {
        throw badRequest('Payslip cannot be regenerated after lock/close.');
      }

      const totals = computeTotals(items);
      const paymentStatus = computePaymentStatus({ net: totals.net, payments });

      const payslipNumber = `PSL-${ym.year}-${String(ym.month).padStart(2, '0')}-${String(seq).padStart(4, '0')}`;
      seq += 1;

      const { earnings, deductions } = groupSnapshotItems(items);
      const snapshot = {
        earnings,
        deductions,
        gross: totals.gross,
        net: totals.net,
        paymentStatus
      };

      const pdfBuffer = await generatePayslipPdf({
        payrollRun: run,
        employee,
        payslipNumber,
        items,
        payments,
        totals,
        paymentStatus
      });

      const safeEmp = String(employee.employeeCode || employeeId).replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeSlip = String(payslipNumber).replace(/[^a-zA-Z0-9_-]/g, '_');
      const stored = await storePayslip({ payrollRun: run, fileBaseName: `${safeEmp}_${safeSlip}`, pdfBuffer });

      const fileName = `${payslipNumber}_${safeEmp}.pdf`;

      const slip = await insertPayslip(client, {
        id: crypto.randomUUID(),
        payroll_run_id: run.id,
        employee_id: employeeId,
        payslip_number: payslipNumber,
        month: run.month,
        gross: totals.gross,
        total_adjustments: totals.totalAdjustments,
        total_deductions: totals.totalDeductions,
        net: totals.net,
        payment_status: paymentStatus,
        snapshot,
        pdf_path: stored.pdfPath,
        storage_key: stored.storageKey,
        file_name: fileName,
        content_type: 'application/pdf',
        file_size: stored.fileSize,
        generated_at: now,
        generated_by: actorId
      });

      if (!slip) continue;
      created += 1;

      await writeAuditLog(client, {
        requestId,
        entityType: 'PAYSLIP',
        entityId: slip.id,
        action: 'PAYSLIP_GENERATED',
        beforeData: null,
        afterData: {
          payroll_run_id: slip.payroll_run_id,
          employee_id: slip.employee_id,
          month: slip.month,
          gross: slip.gross,
          total_adjustments: slip.total_adjustments,
          total_deductions: slip.total_deductions,
          net: slip.net,
          payment_status: slip.payment_status,
          pdf_path: slip.pdf_path,
          storage_key: slip.storage_key,
          file_name: slip.file_name,
          file_size: slip.file_size
        },
        actorId,
        actorRole: null,
        reason: null
      });
    }

    return { created };
  });
}

export async function downloadPayslipService(pool, { id, actorId, actorPermissions }) {
  await assertPayrollEnabled(pool);

  const slip = await getPayslipById(pool, { id });
  if (!slip) throw notFound('Payslip not found');

  const perms = Array.isArray(actorPermissions) ? actorPermissions.map((p) => String(p)) : [];
  const canReadAll = perms.includes('PAYROLL_RUN_READ') || perms.includes('PAYSLIP_GENERATE');

  if (!canReadAll) {
    const canSelf = perms.includes('PAYSLIP_VIEW_SELF');
    if (!canSelf) throw forbidden();

    const employeeId = await getEmployeeIdByUserId(pool, { userId: actorId });
    if (!employeeId) throw forbidden();
    if (String(employeeId) !== String(slip.employee_id)) throw forbidden();
  }

  return slip;
}
