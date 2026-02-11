import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';
import { parsePagination, pagedResponse } from '../../../shared/kernel/pagination.js';
import { badRequest, notFound } from '../../../shared/kernel/errors.js';

import {
  addCompensationSchema,
  changeScopeSchema,
  changeStatusSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  uploadDocumentSchema
} from '../dto/employeeSchemas.js';

import {
  addCompensationVersion,
  changeEmployeeScope,
  changeEmployeeStatus,
  createEmployee,
  getEmployeeDocumentForDownload,
  getEmployeeWithScopeHistory,
  getEligibleReportingManagers,
  listEmployeeCompensation,
  listEmployeeDocumentsService,
  listEmployeesPaged,
  toCompensationListDto,
  toDocumentListDto,
  toEmployeeDetailDto,
  updateEmployee,
  uploadEmployeeDocument
} from '../service/employeeService.js';

function cleanIdempotencyKey(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  return s.slice(0, 80);
}

export function employeeController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const divisionId = req.query.divisionId ? String(req.query.divisionId) : null;
      const scope = req.query.scope ? String(req.query.scope) : null;
      const status = req.query.status ? String(req.query.status) : null;

      const { rows, total } = await listEmployeesPaged(pool, { divisionId, scope, status, offset, limit });

      res.json(
        pagedResponse({
          items: rows.map((r) => ({
            id: r.id,
            employeeCode: r.employee_code,
            firstName: r.first_name,
            lastName: r.last_name,
            email: r.email,
            phone: r.phone,
            status: r.status,
            scope: r.scope,
            primaryDivisionId: r.primary_division_id,
            updatedAt: r.updated_at
          })),
          total,
          page,
          pageSize
        })
      );
    }),

    getById: asyncHandler(async (req, res) => {
      const payload = await getEmployeeWithScopeHistory(pool, { id: req.params.id });
      if (!payload) throw notFound('Employee not found');
      res.json(toEmployeeDetailDto(payload));
    }),

    getEligibleReportingManagers: asyncHandler(async (req, res) => {
      const divisionId = req.query.divisionId ? String(req.query.divisionId) : null;
      const managers = await getEligibleReportingManagers(pool, { divisionId });
      res.json({ items: managers });
    }),

    create: asyncHandler(async (req, res) => {
      const body = validate(createEmployeeSchema, req.body);
      const idempotencyKey = cleanIdempotencyKey(req.header('x-idempotency-key'));

      const created = await createEmployee(pool, {
        employeeCode: body.employeeCode,
        firstName: body.firstName,
        lastName: body.lastName,
        designation: body.designation || null,
        email: body.email || null,
        phone: body.phone || null,
        status: body.status,
        scope: body.scope,
        primaryDivisionId: body.primaryDivisionId || null,
        reportingManagerId: body.reportingManagerId || null,
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason,
        idempotencyKey
      });

      res.status(201).json({ item: created ? {
        id: created.id,
        employeeCode: created.employee_code,
        firstName: created.first_name,
        lastName: created.last_name,
        designation: created.designation,
        email: created.email,
        phone: created.phone,
        status: created.status,
        scope: created.scope,
        primaryDivisionId: created.primary_division_id,
        reportingManagerId: created.reporting_manager_id,
        reportingManagerName: created.reporting_manager_name,
        updatedAt: created.updated_at
      } : null });
    }),

    update: asyncHandler(async (req, res) => {
      const body = validate(updateEmployeeSchema, req.body);
      const updated = await updateEmployee(pool, {
        id: req.params.id,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        roles: body.roles,
        actorId: req.auth.userId,
        actorSystemRoles: req.authorization?.roles || [],
        requestId: req.requestId,
        reason: body.reason
      });

      res.json({ item: {
        id: updated.id,
        employeeCode: updated.employee_code,
        firstName: updated.first_name,
        lastName: updated.last_name,
        email: updated.email,
        phone: updated.phone,
        status: updated.status,
        scope: updated.scope,
        primaryDivisionId: updated.primary_division_id,
        updatedAt: updated.updated_at
      } });
    }),

    changeScope: asyncHandler(async (req, res) => {
      const body = validate(changeScopeSchema, req.body);
      const updated = await changeEmployeeScope(pool, {
        id: req.params.id,
        scope: body.scope,
        primaryDivisionId: body.primaryDivisionId || null,
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason
      });

      res.json({ item: {
        id: updated.id,
        employeeCode: updated.employee_code,
        firstName: updated.first_name,
        lastName: updated.last_name,
        email: updated.email,
        phone: updated.phone,
        status: updated.status,
        scope: updated.scope,
        primaryDivisionId: updated.primary_division_id,
        updatedAt: updated.updated_at
      } });
    }),

    changeStatus: asyncHandler(async (req, res) => {
      const body = validate(changeStatusSchema, req.body);
      const updated = await changeEmployeeStatus(pool, {
        id: req.params.id,
        status: body.status,
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason
      });

      res.json({ item: {
        id: updated.id,
        employeeCode: updated.employee_code,
        firstName: updated.first_name,
        lastName: updated.last_name,
        email: updated.email,
        phone: updated.phone,
        status: updated.status,
        scope: updated.scope,
        primaryDivisionId: updated.primary_division_id,
        updatedAt: updated.updated_at
      } });
    }),

    listCompensation: asyncHandler(async (req, res) => {
      const rows = await listEmployeeCompensation(pool, { employeeId: req.params.id });
      res.json(toCompensationListDto(rows));
    }),

    addCompensation: asyncHandler(async (req, res) => {
      const body = validate(addCompensationSchema, req.body);
      const rows = await addCompensationVersion(pool, {
        employeeId: req.params.id,
        amount: body.amount,
        currency: body.currency,
        frequency: body.frequency,
        effectiveFrom: body.effectiveFrom,
        reason: body.reason,
        actorId: req.auth.userId,
        requestId: req.requestId
      });

      res.status(201).json(toCompensationListDto(rows));
    }),

    listDocuments: asyncHandler(async (req, res) => {
      const rows = await listEmployeeDocumentsService(pool, { employeeId: req.params.id });
      res.json(toDocumentListDto(rows));
    }),

    uploadDocument: asyncHandler(async (req, res) => {
      const body = validate(uploadDocumentSchema, req.body);
      const rows = await uploadEmployeeDocument(pool, {
        employeeId: req.params.id,
        documentType: body.documentType,
        fileName: body.fileName,
        storageKey: body.storageKey,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason
      });

      res.status(201).json(toDocumentListDto(rows));
    }),

    downloadDocument: asyncHandler(async (req, res) => {
      const doc = await getEmployeeDocumentForDownload(pool, { employeeId: req.params.id, docId: req.params.docId });
      if (!doc) throw notFound('Document not found');

      if (!doc.is_active) {
        throw badRequest('Document is inactive');
      }

      const target = String(doc.storage_key || '').trim();
      if (!target || !(target.startsWith('http://') || target.startsWith('https://'))) {
        throw badRequest('Document storageKey must be a signed URL');
      }

      res.json({ url: target });
    })
  };
}
