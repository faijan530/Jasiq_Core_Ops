import PDFDocument from 'pdfkit';

function toIsoMonth(monthValue) {
  const raw = String(monthValue || '').slice(0, 10);
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return String(monthValue || '').slice(0, 7);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function fmtMoney(n) {
  const v = typeof n === 'string' ? Number(n) : Number(n ?? 0);
  const safe = Number.isFinite(v) ? v : 0;
  return safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function groupItems(items) {
  const earnings = [];
  const deductions = [];
  const adjustments = [];

  for (const it of items || []) {
    const t = String(it?.item_type || '').toUpperCase();
    const row = {
      type: t,
      description: String(it?.description || ''),
      amount: it?.amount
    };
    if (t === 'DEDUCTION') deductions.push(row);
    else if (t === 'ADJUSTMENT') adjustments.push(row);
    else earnings.push(row);
  }

  return { earnings, deductions, adjustments };
}

function sumAmounts(rows) {
  return (rows || []).reduce((s, r) => s + (Number(r?.amount || 0) || 0), 0);
}

function collect(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function drawKeyValue(doc, { x, y, k, v, kWidth = 130 }) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155').text(k, x, y, { width: kWidth });
  doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(v, x + kWidth, y, { width: 420 - kWidth });
}

function drawTable(doc, { x, y, title, rows, emptyText = '—' }) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(title, x, y);
  y += 14;

  doc
    .lineWidth(1)
    .strokeColor('#e2e8f0')
    .rect(x, y, 500, 18)
    .fillAndStroke('#f8fafc', '#e2e8f0');
  doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9);
  doc.text('Description', x + 8, y + 5, { width: 360 });
  doc.text('Amount', x + 380, y + 5, { width: 112, align: 'right' });

  y += 18;
  doc.font('Helvetica').fontSize(9).fillColor('#0f172a');

  if (!rows || rows.length === 0) {
    doc
      .lineWidth(1)
      .strokeColor('#e2e8f0')
      .rect(x, y, 500, 18)
      .stroke();
    doc.fillColor('#64748b').text(emptyText, x + 8, y + 5);
    return y + 26;
  }

  for (const r of rows) {
    doc
      .lineWidth(1)
      .strokeColor('#e2e8f0')
      .rect(x, y, 500, 18)
      .stroke();
    doc.fillColor('#0f172a').text(String(r.description || ''), x + 8, y + 5, { width: 360 });
    doc.text(fmtMoney(r.amount), x + 380, y + 5, { width: 112, align: 'right' });
    y += 18;
  }

  return y + 8;
}

export async function generatePayslipPdf({ payrollRun, employee, payslipNumber, items, payments, totals, paymentStatus }) {
  const isoMonth = toIsoMonth(payrollRun?.month);
  const { earnings, deductions, adjustments } = groupItems(items);

  const computed = {
    gross: totals?.gross ?? sumAmounts(earnings),
    totalAdjustments: totals?.totalAdjustments ?? sumAmounts(adjustments),
    totalDeductions: totals?.totalDeductions ?? sumAmounts(deductions)
  };
  const net = totals?.net ?? (Number(computed.gross || 0) + Number(computed.totalAdjustments || 0) - Number(computed.totalDeductions || 0));

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  doc.info.Title = `Payslip ${isoMonth} ${employee?.name || ''}`;
  doc.info.Author = 'JASIQ Labs';

  // Header
  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor('#0f172a')
    .text('JASIQ Labs', 48, 40);
  doc.font('Helvetica').fontSize(10).fillColor('#334155').text('Payslip', 48, 62);
  if (payslipNumber) {
    doc.font('Helvetica').fontSize(9).fillColor('#334155').text(String(payslipNumber), 48, 76);
  }

  doc
    .roundedRect(420, 40, 126, 28, 6)
    .fill('#0f172a');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text(isoMonth, 420, 49, { width: 126, align: 'center' });

  // Summary box
  doc
    .roundedRect(48, 88, 498, 92, 10)
    .lineWidth(1)
    .strokeColor('#e2e8f0')
    .fillAndStroke('#ffffff', '#e2e8f0');

  drawKeyValue(doc, { x: 64, y: 104, k: 'Employee', v: employee?.name || '—' });
  drawKeyValue(doc, { x: 64, y: 120, k: 'Employee Code', v: employee?.employeeCode || '—' });
  drawKeyValue(doc, { x: 64, y: 136, k: 'Division', v: employee?.divisionName || '—' });
  drawKeyValue(doc, { x: 320, y: 104, k: 'Period', v: isoMonth || '—', kWidth: 90 });
  drawKeyValue(doc, { x: 320, y: 120, k: 'Status', v: String(paymentStatus || '').toUpperCase() || '—', kWidth: 90 });
  drawKeyValue(doc, { x: 320, y: 136, k: 'Generated', v: new Date().toLocaleString(), kWidth: 90 });

  let y = 196;
  y = drawTable(doc, { x: 48, y, title: 'Earnings', rows: earnings.map((r) => ({ description: r.description, amount: r.amount })) });
  y = drawTable(doc, { x: 48, y, title: 'Adjustments', rows: adjustments.map((r) => ({ description: r.description, amount: r.amount })) });
  y = drawTable(doc, {
    x: 48,
    y,
    title: 'Deductions',
    rows: deductions.map((r) => ({ description: r.description, amount: r.amount })),
    emptyText: 'No deductions applied.'
  });

  // Totals
  doc
    .roundedRect(48, y, 498, 78, 10)
    .lineWidth(1)
    .strokeColor('#e2e8f0')
    .fillAndStroke('#f8fafc', '#e2e8f0');
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('Totals', 64, y + 12);

  const rightX = 48 + 498 - 16;
  doc.font('Helvetica').fontSize(10).fillColor('#0f172a');
  doc.text(`Gross: ${fmtMoney(computed.gross)}`, 64, y + 30);
  doc.text(`Adjustments: ${fmtMoney(computed.totalAdjustments)}`, 64, y + 46);
  doc.text(`Deductions: ${fmtMoney(computed.totalDeductions)}`, 64, y + 62);
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#0f172a')
    .text(`Net Pay: ${fmtMoney(net)}`, 64, y + 30, { width: 498 - 32, align: 'right' });
  doc.moveTo(64, y + 52).lineTo(rightX, y + 52).lineWidth(1).strokeColor('#e2e8f0').stroke();

  y += 92;

  // Payment details
  const p = (payments || [])[0] || null;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('Payment Details', 48, y);
  y += 14;
  doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
  doc.text(`Status: ${String(paymentStatus || '').toUpperCase() || '—'}`, 48, y);
  doc.text(`Date: ${p?.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}`, 48, y + 14);
  doc.text(`Mode: ${p?.method || '—'}`, 48, y + 28);
  doc.text(`Reference: ${p?.reference_id || '—'}`, 48, y + 42);
  y += 66;

  // Footer
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#64748b')
    .text(
      'This document is confidential and intended solely for the employee. It is system-generated and does not require a signature.',
      48,
      782,
      { width: 498, align: 'center' }
    );

  return await collect(doc);
}
