import fs from 'node:fs/promises';
import path from 'node:path';

import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';
import { badRequest, forbidden } from '../../../shared/kernel/errors.js';
import { writeAuditLog } from '../../../shared/kernel/audit.js';
import { withTransaction } from '../../../shared/persistence/transaction.js';

import Joi from 'joi';

import { toReportFilterDto } from '../dtos/reportFilter.dto.js';

import {
  getRevenueReportService,
  getExpenseReportService,
  getPnlReportService,
  getReceivablesReportService,
  getPayablesReportService,
  getCashflowReportService
} from '../services/reporting.service.js';

import { exportReportCsvService } from '../services/reportExport.service.js';
import { issueReportExportToken, verifyReportExportToken } from '../services/reportExportToken.service.js';

const exportSchema = Joi.object({
  reportType: Joi.string().valid('REVENUE', 'EXPENSE', 'PNL', 'RECEIVABLES', 'PAYABLES', 'CASHFLOW').required(),
  filter: Joi.object().required()
});

export function reportingController({ pool }) {
  return {
    revenue: asyncHandler(async (req, res) => {
      const filter = toReportFilterDto(req.query);
      const payload = await getRevenueReportService(pool, { filter, actorId: req.auth.userId });
      res.json(payload);
    }),

    expense: asyncHandler(async (req, res) => {
      const filter = toReportFilterDto(req.query);
      const payload = await getExpenseReportService(pool, { filter, actorId: req.auth.userId });
      res.json(payload);
    }),

    pnl: asyncHandler(async (req, res) => {
      const filter = toReportFilterDto(req.query);
      const payload = await getPnlReportService(pool, { filter, actorId: req.auth.userId });
      res.json(payload);
    }),

    receivables: asyncHandler(async (req, res) => {
      const filter = toReportFilterDto(req.query);
      const payload = await getReceivablesReportService(pool, { filter, actorId: req.auth.userId });
      res.json(payload);
    }),

    payables: asyncHandler(async (req, res) => {
      const filter = toReportFilterDto(req.query);
      const payload = await getPayablesReportService(pool, { filter, actorId: req.auth.userId });
      res.json(payload);
    }),

    cashflow: asyncHandler(async (req, res) => {
      const filter = toReportFilterDto(req.query);
      const payload = await getCashflowReportService(pool, { filter, actorId: req.auth.userId });
      res.json(payload);
    }),

    exportCsv: asyncHandler(async (req, res) => {
      const body = validate(exportSchema, req.body);
      const reportType = body.reportType;
      const filter = toReportFilterDto(body.filter);

      const actorId = req.auth?.userId;
      const actorRole = req.auth?.claims?.role || null;
      if (!actorId) throw badRequest('Missing auth context');

      const exportInfo = await exportReportCsvService(pool, { reportType, filter, actorId });

      const exp = Date.now() + 10 * 60 * 1000;
      const token = issueReportExportToken({
        relPath: exportInfo.relPath,
        fileName: exportInfo.fileName,
        expEpochMs: exp,
        actorId
      });

      await withTransaction(pool, async (client) => {
        await writeAuditLog(client, {
          requestId: req.requestId,
          entityType: 'REPORT_EXPORT',
          entityId: null,
          action: 'REPORT_EXPORT_CSV',
          beforeData: null,
          afterData: {
            reportType: exportInfo.reportType,
            filter,
            fileName: exportInfo.fileName,
            sizeBytes: exportInfo.sizeBytes,
            rowCount: exportInfo.rowCount
          },
          actorId,
          actorRole,
          reason: 'CSV export'
        });
      });

      res.status(201).json({
        reportType: exportInfo.reportType,
        fileName: exportInfo.fileName,
        sizeBytes: exportInfo.sizeBytes,
        rowCount: exportInfo.rowCount,
        expiresAt: new Date(exp).toISOString(),
        downloadUrl: `/api/v1/reports/exports/download?token=${encodeURIComponent(token)}`
      });
    }),

    downloadExport: asyncHandler(async (req, res) => {
      const token = String(req.query.token || '').trim();
      if (!token) throw badRequest('token is required');

      const actorId = req.auth?.userId;
      if (!actorId) throw badRequest('Missing auth context');

      const { relPath, fileName } = verifyReportExportToken(token, { actorId });

      if (!String(relPath).startsWith('storage/report_exports/')) {
        throw forbidden();
      }

      const absCandidate = path.resolve(process.cwd(), relPath);
      const abs = await fs.realpath(absCandidate).catch(() => null);
      if (!abs) throw badRequest('File not found');

      // Ensure path stays within cwd/storage/report_exports
      const allowedBase = await fs.realpath(path.resolve(process.cwd(), 'storage', 'report_exports')).catch(() => null);
      if (!allowedBase || !abs.startsWith(allowedBase)) throw forbidden();

      res.setHeader('content-type', 'text/csv; charset=utf-8');
      res.setHeader('content-disposition', `attachment; filename="${String(fileName).replace(/\"/g, '')}"`);

      const buf = await fs.readFile(abs);
      res.send(buf);
    })
  };
}
