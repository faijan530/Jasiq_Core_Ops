import fs from 'node:fs/promises';
import path from 'node:path';

function toIsoMonth(monthValue) {
  const raw = String(monthValue || '').slice(0, 10);
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return String(monthValue || '').slice(0, 7);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

export async function storePayslip({ payrollRun, employeeId, fileBaseName, pdfBuffer }) {
  const size = pdfBuffer ? pdfBuffer.length : 0;
  const isoMonth = toIsoMonth(payrollRun?.month);
  const year = isoMonth.slice(0, 4);
  const month = isoMonth.slice(5, 7);

  const relDir = path.join('storage', 'payslips', year, month);
  const safeName = String(fileBaseName || employeeId || 'payslip').replace(/[^a-zA-Z0-9_-]/g, '_');
  const relFile = path.join(relDir, `${safeName}.pdf`);
  const absFile = path.resolve(process.cwd(), relFile);

  await fs.mkdir(path.dirname(absFile), { recursive: true });
  await fs.writeFile(absFile, pdfBuffer);

  return {
    storageKey: `payslips/${year}/${month}/${safeName}.pdf`,
    fileSize: size,
    pdfPath: relFile.replace(/\\/g, '/')
  };
}
