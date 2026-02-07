import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import crypto from 'node:crypto';

import { asyncHandler } from '../kernel/asyncHandler.js';
import { validate } from '../kernel/validation.js';
import { config } from '../kernel/config.js';
import { writeAuditLog } from '../kernel/audit.js';
import { badRequest, conflict, forbidden } from '../kernel/errors.js';
import { withTransaction } from '../persistence/transaction.js';

const strongPasswordSchema = Joi.string()
  .min(8)
  .max(200)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
  .required();

const bootstrapSignupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  email: Joi.string().email().required(),
  password: strongPasswordSchema
});

const createAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  email: Joi.string().email().required(),
  password: strongPasswordSchema,
  role: Joi.string().valid('ADMIN', 'SUPER_ADMIN').required()
});

async function superAdminExists(client) {
  const res = await client.query(
    `SELECT 1
     FROM admin_user
     WHERE role_name = 'SUPER_ADMIN' AND is_active = true
     LIMIT 1`
  );
  return res.rowCount > 0;
}

async function emailExists(client, email) {
  const res = await client.query(
    `SELECT 1 FROM admin_user WHERE email = $1 LIMIT 1`,
    [email.trim().toLowerCase()]
  );
  return res.rowCount > 0;
}

async function requireRoleIdByName(client, roleName) {
  const res = await client.query(`SELECT id FROM role WHERE name = $1`, [roleName]);
  if (res.rowCount === 0) throw badRequest(`Role not found: ${roleName}`);
  return res.rows[0].id;
}

async function insertAdminUser(client, { id, name, email, passwordHash, roleName, actorId }) {
  const userId = id || crypto.randomUUID();

  await client.query(
    `INSERT INTO admin_user (id, email, password_hash, role_name, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      userId,
      email.trim().toLowerCase(),
      passwordHash,
      roleName,
      actorId,
      actorId
    ]
  );

  // Store name in audit only (admin_user table currently doesn't have a name column)
  return userId;
}

async function ensureUserRole(client, { userId, roleName }) {
  const roleId = await requireRoleIdByName(client, roleName);

  await client.query(
    `INSERT INTO user_role (id, user_id, role_id, scope, division_id)
     VALUES (gen_random_uuid(), $1, $2, 'COMPANY', NULL)
     ON CONFLICT DO NOTHING`,
    [userId, roleId]
  );
}

function issueAccessToken({ userId, roleName }) {
  const expiresIn = roleName === 'TECH_ADMIN' ? '2h' : '4h';
  return jwt.sign(
    {
      sub: userId,
      role: roleName
    },
    config.jwt.secret,
    {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      expiresIn
    }
  );
}

export function adminManagementController({ pool }) {
  return {
    bootstrapStatus: asyncHandler(async (req, res) => {
      const result = await withTransaction(pool, async (client) => {
        const hasSuperAdmin = await superAdminExists(client);
        return {
          hasSuperAdmin,
          bootstrapSignupEnabled: !hasSuperAdmin
        };
      });

      res.json(result);
    }),

    bootstrapSignup: asyncHandler(async (req, res) => {
      const body = validate(bootstrapSignupSchema, req.body);
      const name = body.name;
      const email = body.email.trim().toLowerCase();
      const password = body.password;

      const token = await withTransaction(pool, async (client) => {
        const hasSuperAdmin = await superAdminExists(client);
        if (hasSuperAdmin) {
          throw forbidden('Bootstrap signup is disabled');
        }

        if (await emailExists(client, email)) {
          throw conflict('Email already exists');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const userId = await insertAdminUser(client, {
          name,
          email,
          passwordHash,
          roleName: 'SUPER_ADMIN',
          actorId: '00000000-0000-0000-0000-000000000001'
        });

        await ensureUserRole(client, { userId, roleName: 'SUPER_ADMIN' });

        await writeAuditLog(client, {
          requestId: req.requestId,
          entityType: 'ADMIN_USER',
          entityId: userId,
          action: 'SUPER_ADMIN_BOOTSTRAPPED',
          beforeData: null,
          afterData: { id: userId, email, name, role: 'SUPER_ADMIN' },
          actorId: userId,
          actorRole: 'SUPER_ADMIN',
          reason: 'Initial system bootstrap signup'
        });

        return issueAccessToken({ userId, roleName: 'SUPER_ADMIN' });
      });

      res.json({ accessToken: token });
    }),

    createAdmin: asyncHandler(async (req, res) => {
      const body = validate(createAdminSchema, req.body);

      const name = body.name;
      const email = body.email.trim().toLowerCase();
      const password = body.password;
      const requestedRole = body.role;

      const actorId = req.auth?.userId;
      const actorRole = req.auth?.claims?.role || null;

      if (!actorId) {
        throw badRequest('Missing auth context');
      }

      if (requestedRole === 'SUPER_ADMIN' && actorRole !== 'SUPER_ADMIN' && actorRole !== 'COREOPS_ADMIN') {
        throw forbidden('Only SUPER_ADMIN can create SUPER_ADMIN');
      }

      const createdUserId = await withTransaction(pool, async (client) => {
        if (await emailExists(client, email)) {
          throw conflict('Email already exists');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const userId = await insertAdminUser(client, {
          name,
          email,
          passwordHash,
          roleName: requestedRole,
          actorId
        });

        await ensureUserRole(client, { userId, roleName: requestedRole });

        await writeAuditLog(client, {
          requestId: req.requestId,
          entityType: 'ADMIN_USER',
          entityId: userId,
          action: 'ADMIN_CREATED',
          beforeData: null,
          afterData: { id: userId, email, name, role: requestedRole },
          actorId,
          actorRole,
          reason: 'Admin created another admin'
        });

        return userId;
      });

      res.status(201).json({ id: createdUserId, email, name, role: requestedRole });
    })
  };
}
