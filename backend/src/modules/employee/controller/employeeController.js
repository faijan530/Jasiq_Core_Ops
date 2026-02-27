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

import { listPayslipsByEmployee } from '../../payroll/repositories/payslip.repository.js';

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

    listMyPayslips: asyncHandler(async (req, res) => {
      const employeeId = req.params.id;
      if (!employeeId) throw badRequest('Employee not found');
      const rows = await listPayslipsByEmployee(pool, { employeeId });

      const items = (rows || []).map((r) => ({
        id: r.id,
        month: r.month,
        gross: r.gross,
        total_deductions: r.total_deductions,
        net: r.net,
        payment_status: r.payment_status,
        generated_at: r.generated_at
      }));

      res.json(items);
    }),

    getEligibleReportingManagers: asyncHandler(async (req, res) => {
      const divisionId = req.query.divisionId ? String(req.query.divisionId) : null;
      
      try {
        const managers = await getEligibleReportingManagers(pool, { divisionId });
        res.json({ items: managers });
      } catch (error) {
        if (error.message.includes('not found or inactive')) {
          res.status(400).json({ 
            message: error.message,
            code: 'DIVISION_NOT_FOUND'
          });
        } else {
          throw error;
        }
      }
    }),

    create: asyncHandler(async (req, res) => {
      console.log('=== employeeController.create debug ===');
      console.log('Incoming body:', req.body);
      console.log('req.user:', req.user);
      console.log('req.auth:', req.auth);
      
      const body = validate(createEmployeeSchema, req.body);
      const idempotencyKey = cleanIdempotencyKey(req.header('x-idempotency-key'));

      // Extract role from validated body
      const role = body.roleId; // roleId is now validated in schema
      console.log('Extracted role:', role);
      
      // Validate role
      const allowedRoles = ['EMPLOYEE', 'HR_ADMIN', 'FINANCE_ADMIN', 'MANAGER', 'FOUNDER'];
      if (!role) {
        return res.status(400).json({ message: 'Role is required' });
      }
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ 
          message: 'Invalid role value',
          allowedRoles,
          received: role
        });
      }

      // Permission-based check instead of role-based
      const permissions = req.user?.permissions || [];
      const hasSystemFullAccess = permissions.includes('SYSTEM_FULL_ACCESS');
      
      // Elevation check: if assigning elevated role, require SYSTEM_FULL_ACCESS
      const elevatedRoles = ['HR_ADMIN', 'FINANCE_ADMIN', 'MANAGER', 'FOUNDER'];
      const isAssigningElevatedRole = elevatedRoles.includes(role);
      
      console.log('Has SYSTEM_FULL_ACCESS:', hasSystemFullAccess);
      console.log('Is assigning elevated role:', isAssigningElevatedRole);
      console.log('Requested role:', role);
      
      if (isAssigningElevatedRole && !hasSystemFullAccess) {
        console.log('403: Cannot assign elevated role without SYSTEM_FULL_ACCESS');
        return res.status(403).json({ message: 'Insufficient privilege to assign this role' });
      }

      try {
        const created = await createEmployee(pool, {
          employeeCode: body.employeeCode,
          firstName: body.firstName,
          lastName: body.lastName,
          designation: body.designation || null,
          email: body.email || null,
          phone: body.phone || null,
          password: body.password,
          status: body.status,
          scope: body.scope,
          primaryDivisionId: body.primaryDivisionId || null,
          reportingManagerId: body.reportingManagerId || null,
          role, // Pass the extracted role
          actorId: req.auth.userId,
          requestId: req.requestId,
          reason: body.reason,
          idempotencyKey
        });

        const roleDisplayMap = {
        EMPLOYEE: 'Employee',
        HR_ADMIN: 'HR Admin',
        FINANCE_ADMIN: 'Finance Admin',
        MANAGER: 'Manager',
        FOUNDER: 'Founder'
      };
      const roleLabel = roleDisplayMap[role] || 'Employee';

      res.status(201).json({
        message: `${roleLabel} created successfully`,
        data: created ? {
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
          role: role, // Include the role in response
          updatedAt: created.updated_at,
          setupLink: created.setupLink || null
        } : null
      });
      } catch (error) {
        console.log('Database error:', error);
        
        // Handle unique constraint violations
        if (error.code === '23505') {
          let message = 'Employee already exists';
          if (error.detail?.includes('email')) {
            message = 'Employee already exists with this email';
          } else if (error.detail?.includes('employee_code')) {
            message = 'Employee already exists with this employee code';
          }
          return res.status(409).json({ message });
        }
        
        throw error; // Re-throw other errors
      }
    }),

    update: asyncHandler(async (req, res) => {
      console.log('=== employeeController.update debug ===');
      console.log('req.user:', req.user);
      
      const body = validate(updateEmployeeSchema, req.body);
      const permissions = req.user?.permissions || [];
      const hasSystemFullAccess = permissions.includes('SYSTEM_FULL_ACCESS');
      
      // Elevation check for HR_ADMIN and FINANCE_ADMIN roles
      const restrictedRoles = ['HR_ADMIN', 'FINANCE_ADMIN'];
      const isAssigningRestricted = body.roles?.some(role => restrictedRoles.includes(role));
      const isRemovingRestricted = false; // Would need to fetch current roles to check
      
      console.log('Has SYSTEM_FULL_ACCESS:', hasSystemFullAccess);
      console.log('Requested roles:', body.roles);
      console.log('Is assigning restricted:', isAssigningRestricted);
      
      if ((isAssigningRestricted || isRemovingRestricted) && !hasSystemFullAccess) {
        console.log('403: Cannot modify HR/FINANCE roles without SYSTEM_FULL_ACCESS');
        return res.status(403).json({ message: 'Insufficient privilege to modify these roles' });
      }
      
      const updated = await updateEmployee(pool, {
        id: req.params.id,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        roles: body.roles,
        actorId: req.auth.userId,
        actorSystemRoles: hasSystemFullAccess ? ['SUPER_ADMIN'] : [], // Pass minimal required for service compatibility
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
      if (!target || !(target.startsWith('http://') || target.startsWith('https://') || target.startsWith('data:'))) {
        throw badRequest('Document storageKey must be a signed URL or data URL');
      }

      res.json({ url: target });
    })
  };
}
