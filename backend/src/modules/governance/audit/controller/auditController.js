import Joi from 'joi';
import fs from 'node:fs/promises';
import path from 'node:path';

import { asyncHandler } from '../../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../../shared/kernel/validation.js';
import { parsePagination, pagedResponse } from '../../../../shared/kernel/pagination.js';
import { badRequest, forbidden } from '../../../../shared/kernel/errors.js';
import { getUserGrants } from '../../../../shared/kernel/authorization.js';
import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { toAuditLogDto } from '../domain/audit.js';
import { listAuditLogsPaged, listAuditTimelinePaged } from '../service/auditService.js';
import { toCsv, storeCsvTemp } from '../../../reporting/services/csvExporter.service.js';
import { issueReportExportToken, verifyReportExportToken } from '../../../reporting/services/reportExportToken.service.js';

const querySchema = Joi.object({
  entityType: Joi.string().max(50).allow('', null),
  entityId: Joi.string().allow('', null),
  action: Joi.string().max(30).allow('', null),
  severity: Joi.string().max(20).allow('', null),
  scope: Joi.string().max(20).allow('', null),
  divisionId: Joi.string().allow('', null),
  actorId: Joi.string().allow('', null),
  requestId: Joi.string().max(60).allow('', null),
  reasonContains: Joi.string().max(200).allow('', null),
  createdFrom: Joi.date().iso().allow('', null),
  createdTo: Joi.date().iso().allow('', null)
});

const timelineSchema = Joi.object({
  entityType: Joi.string().max(60).required(),
  entityId: Joi.string().required()
});

const exportSchema = Joi.object({
  from: Joi.date().iso().required(),
  to: Joi.date().iso().required(),
  entityType: Joi.string().max(60).allow('', null),
  entityId: Joi.string().allow('', null),
  action: Joi.string().max(40).allow('', null),
  divisionId: Joi.string().allow('', null),
  severity: Joi.string().max(20).allow('', null),
  reasonContains: Joi.string().max(200).allow('', null),
  format: Joi.string().valid('CSV').required(),
  reason: Joi.string().allow('', null)
});

function isUuidV4(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

async function resolveDivisionBoundary(pool, req, permissionCode) {
  const userId = req.auth?.userId;
  if (!userId) throw badRequest('Missing auth context');

  const grants = await getUserGrants(pool, userId);

  if (grants.permissions.includes('SYSTEM_FULL_ACCESS') || grants.roles.includes('SUPER_ADMIN')) {
    return { isCompany: true, divisionIds: null };
  }

  const relevant = (grants.scoped || []).filter((g) => g.permissionCode === permissionCode);
  if (relevant.some((g) => g.scope === 'COMPANY')) {
    return { isCompany: true, divisionIds: null };
  }

  const divisionIds = relevant
    .filter((g) => g.scope === 'DIVISION' && g.divisionId)
    .map((g) => String(g.divisionId));

  return { isCompany: false, divisionIds: divisionIds.length ? divisionIds : [] };
}

function auditRowsToCsv(rows) {
  const headers = [
    'created_at',
    'request_id',
    'entity_type',
    'entity_id',
    'action',
    'severity',
    'scope',
    'division_id',
    'actor_id',
    'actor_role',
    'reason'
  ];

  const csvRows = (rows || []).map((r) => [
    r.created_at,
    r.request_id,
    r.entity_type,
    r.entity_id,
    r.action,
    r.severity,
    r.scope,
    r.division_id,
    r.actor_id,
    r.actor_role,
    r.reason
  ]);

  return { headers, rows: csvRows };
}

export function auditController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const q = validate(querySchema, req.query);

      const boundary = await resolveDivisionBoundary(pool, req, 'GOV_AUDIT_READ');

      const filters = {
        entityType: (q.entityType && q.entityType !== 'undefined') ? q.entityType : null,
        entityId: (q.entityId && q.entityId !== 'undefined') ? (() => {
          if (!isUuidV4(q.entityId)) {
            throw new Error('entityId must be a valid UUID v4');
          }
          return q.entityId;
        })() : null,
        action: (q.action && q.action !== 'undefined') ? q.action : null,
        severity: (q.severity && q.severity !== 'undefined') ? String(q.severity).toUpperCase() : null,
        scope: (q.scope && q.scope !== 'undefined') ? String(q.scope).toUpperCase() : null,
        divisionId: (q.divisionId && q.divisionId !== 'undefined') ? (() => {
          if (!isUuidV4(q.divisionId)) throw new Error('divisionId must be a valid UUID v4');
          return q.divisionId;
        })() : null,
        divisionIds: boundary.isCompany ? null : boundary.divisionIds,
        actorId: (q.actorId && q.actorId !== 'undefined') ? q.actorId : null,
        requestId: (q.requestId && q.requestId !== 'undefined') ? q.requestId : null,
        reasonContains: (q.reasonContains && q.reasonContains !== 'undefined') ? q.reasonContains : null,
        createdFrom: (q.createdFrom && q.createdFrom !== 'undefined') ? q.createdFrom : null,
        createdTo: (q.createdTo && q.createdTo !== 'undefined') ? q.createdTo : null
      };

      if (filters.divisionId && !boundary.isCompany) {
        const allowed = Array.isArray(boundary.divisionIds) ? boundary.divisionIds : [];
        if (!allowed.includes(String(filters.divisionId))) throw forbidden();
      }

      const { rows, total } = await listAuditLogsPaged(pool, { filters, offset, limit });

      res.json(pagedResponse({
        items: rows.map(toAuditLogDto),
        total,
        page,
        pageSize
      }));
    }),

    timeline: asyncHandler(async (req, res) => {
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const q = validate(timelineSchema, req.query);

      const entityType = String(q.entityType || '').trim();
      const entityId = String(q.entityId || '').trim();
      if (!entityType) throw badRequest('entityType is required');
      if (!isUuidV4(entityId)) throw badRequest('entityId must be a valid UUID v4');

      const boundary = await resolveDivisionBoundary(pool, req, 'GOV_AUDIT_READ');

      const { rows, total } = await listAuditTimelinePaged(pool, { entityType, entityId, offset, limit });

      const filtered = boundary.isCompany
        ? rows
        : rows.filter((r) => r.division_id && boundary.divisionIds.includes(String(r.division_id)));

      res.json(pagedResponse({
        items: filtered.map(toAuditLogDto),
        total: boundary.isCompany ? total : filtered.length,
        page,
        pageSize
      }));
    }),

    exportCsv: asyncHandler(async (req, res) => {
      const body = validate(exportSchema, req.body);

      const boundary = await resolveDivisionBoundary(pool, req, 'GOV_AUDIT_EXPORT');

      const from = new Date(body.from);
      const to = new Date(body.to);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw badRequest('Invalid date range');

      const filters = {
        entityType: body.entityType ? String(body.entityType) : null,
        entityId: body.entityId ? (() => {
          if (!isUuidV4(body.entityId)) throw badRequest('entityId must be a valid UUID v4');
          return body.entityId;
        })() : null,
        action: body.action ? String(body.action) : null,
        severity: body.severity ? String(body.severity).toUpperCase() : null,
        scope: null,
        divisionId: body.divisionId ? (() => {
          if (!isUuidV4(body.divisionId)) throw badRequest('divisionId must be a valid UUID v4');
          return body.divisionId;
        })() : null,
        divisionIds: boundary.isCompany ? null : boundary.divisionIds,
        actorId: null,
        requestId: null,
        reasonContains: body.reasonContains ? String(body.reasonContains) : null,
        createdFrom: from.toISOString(),
        createdTo: to.toISOString()
      };

      if (filters.divisionId && !boundary.isCompany) {
        const allowed = Array.isArray(boundary.divisionIds) ? boundary.divisionIds : [];
        if (!allowed.includes(String(filters.divisionId))) throw forbidden();
      }

      const { rows } = await listAuditLogsPaged(pool, { filters, offset: 0, limit: 2000 });

      const csvPayload = auditRowsToCsv(rows);
      const csvText = toCsv({ headers: csvPayload.headers, rows: csvPayload.rows });

      const base = `audit_export_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}`;
      const stored = await storeCsvTemp({ fileBaseName: base, csvText });

      const actorId = req.auth?.userId;
      const exp = Date.now() + 10 * 60 * 1000;
      const token = issueReportExportToken({
        relPath: stored.relPath,
        fileName: stored.fileName,
        expEpochMs: exp,
        actorId
      });

      await withTransaction(pool, async (client) => {
        await writeAuditLog(client, {
          requestId: req.requestId,
          entityType: 'AUDIT_LOG',
          entityId: null,
          action: 'EXPORT_CSV',
          severity: 'MEDIUM',
          scope: boundary.isCompany ? 'COMPANY' : 'DIVISION',
          divisionId: filters.divisionId || null,
          beforeData: null,
          afterData: {
            from: from.toISOString(),
            to: to.toISOString(),
            filter: {
              entityType: filters.entityType,
              entityId: filters.entityId,
              action: filters.action,
              severity: filters.severity,
              divisionId: filters.divisionId,
              reasonContains: filters.reasonContains
            },
            fileName: stored.fileName,
            sizeBytes: stored.sizeBytes,
            rowCount: csvPayload.rows.length
          },
          meta: {
            module: 'audit',
            ip: req.ip,
            userAgent: req.header('user-agent') || null
          },
          actorId,
          actorRole: req.auth?.claims?.role || null,
          actorRoles: req.auth?.claims?.roles || null,
          actorEmail: req.auth?.claims?.email || null,
          reason: body.reason || 'CSV export'
        });
      });

      res.status(201).json({
        fileName: stored.fileName,
        sizeBytes: stored.sizeBytes,
        rowCount: csvPayload.rows.length,
        expiresAt: new Date(exp).toISOString(),
        downloadUrl: `/api/v1/governance/audit/exports/download?token=${encodeURIComponent(token)}`
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

      const allowedBase = await fs.realpath(path.resolve(process.cwd(), 'storage', 'report_exports')).catch(() => null);
      if (!allowedBase || !abs.startsWith(allowedBase)) throw forbidden();

      res.setHeader('content-type', 'text/csv; charset=utf-8');
      res.setHeader('content-disposition', `attachment; filename="${String(fileName).replace(/\"/g, '')}"`);

      const buf = await fs.readFile(abs);
      res.send(buf);
    })
  };
}
