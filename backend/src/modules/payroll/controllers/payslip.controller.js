import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { downloadPayslipService, generatePayslipsForRunService, listPayslipsForRunService } from '../services/payslip.service.js';

export function payslipController({ pool }) {
  return {
    generateForRun: asyncHandler(async (req, res) => {
      const payload = await generatePayslipsForRunService(pool, { id: req.params.id, actorId: req.auth.userId, requestId: req.requestId });
      res.json(payload);
    }),

    listForRun: asyncHandler(async (req, res) => {
      const items = await listPayslipsForRunService(pool, { id: req.params.id });
      res.json({ items });
    }),

    downloadById: asyncHandler(async (req, res) => {
      const slip = await downloadPayslipService(pool, {
        id: req.params.id,
        actorId: req.auth.userId,
        actorPermissions: req.authorization?.permissions || []
      });

      const relPath = slip.pdf_path || null;
      if (!relPath) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payslip PDF not available' } });
        return;
      }

      const absPath = path.resolve(process.cwd(), relPath);
      const pdf = await fs.readFile(absPath);

      res.setHeader('Content-Type', slip.content_type || 'application/pdf');
      res.setHeader('Content-Length', String(pdf.length));
      res.setHeader('Content-Disposition', `attachment; filename="${slip.file_name || 'payslip.pdf'}"`);
      res.status(200).send(pdf);
    })
  };
}
