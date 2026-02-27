import crypto from 'node:crypto';

import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';
import { badRequest, forbidden } from '../../../shared/kernel/errors.js';

import Joi from 'joi';

import {
  diagnoseEmployeeLinkage,
  linkEmployeeToUser,
  fixEmployeeDivisionScope
} from '../application/services/employeeDiagnostic.service.js';

function requireSuperAdmin(req) {
  const role = req.auth?.claims?.role || null;
  if (role !== 'SUPER_ADMIN') {
    throw forbidden('Forbidden');
  }
}

const linkEmployeeUserSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  userId: Joi.string().uuid().required()
});

const fixEmployeeScopeSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  divisionId: Joi.string().uuid().required()
});

export function employeeDiagnosticController({ pool }) {
  return {
    diagnoseByUserId: asyncHandler(async (req, res) => {
      requireSuperAdmin(req);

      const userId = String(req.params.userId || '').trim();
      if (!userId) throw badRequest('userId is required');

      const result = await diagnoseEmployeeLinkage(pool, {
        userId,
        requestId: req.requestId
      });

      res.json(result);
    }),

    linkEmployeeUser: asyncHandler(async (req, res) => {
      requireSuperAdmin(req);

      const body = validate(linkEmployeeUserSchema, req.body);

      const actorId = req.auth?.userId;
      if (!actorId) throw badRequest('Missing auth context');

      const result = await linkEmployeeToUser(pool, {
        employeeId: body.employeeId,
        userId: body.userId,
        actorId,
        actorRole: req.auth?.claims?.role || null,
        requestId: req.requestId
      });

      res.status(201).json({
        requestId: req.requestId,
        ...result
      });
    }),

    fixEmployeeScope: asyncHandler(async (req, res) => {
      requireSuperAdmin(req);

      const body = validate(fixEmployeeScopeSchema, req.body);

      const actorId = req.auth?.userId;
      if (!actorId) throw badRequest('Missing auth context');

      const result = await fixEmployeeDivisionScope(pool, {
        employeeId: body.employeeId,
        divisionId: body.divisionId,
        actorId,
        actorRole: req.auth?.claims?.role || null,
        requestId: req.requestId,
        scopeHistoryId: crypto.randomUUID()
      });

      res.status(201).json({
        requestId: req.requestId,
        ...result
      });
    })
  };
}
