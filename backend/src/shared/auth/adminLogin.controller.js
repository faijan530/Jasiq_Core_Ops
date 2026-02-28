import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';

import { asyncHandler } from '../kernel/asyncHandler.js';
import { validate } from '../kernel/validation.js';
import { config } from '../kernel/config.js';
import { writeAuditLog } from '../kernel/audit.js';
import { unauthorized } from '../kernel/errors.js';
import { refreshTokenService } from './refreshToken.service.js';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required()
});

export function adminLoginController({ pool }) {
  const refreshSvc = refreshTokenService({ pool });

  return {
    login: asyncHandler(async (req, res) => {
      const body = validate(loginSchema, req.body);
      const { email, password } = body;

      const userRes = await pool.query(
        `SELECT id, email, password_hash, role_name, is_active
         FROM admin_user
         WHERE email = $1 AND is_active = true`,
        [email.trim().toLowerCase()]
      );

      if (userRes.rowCount === 0) {
        throw unauthorized('Invalid credentials');
      }

      const user = userRes.rows[0];
      
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      
      if (!passwordMatch) {
        throw unauthorized('Invalid credentials');
      }

      // Verify user has the required role in user_role
      const roleRes = await pool.query(
        `SELECT ur.role_id, r.name as role_name
         FROM user_role ur
         JOIN role r ON r.id = ur.role_id
         WHERE ur.user_id = $1 AND r.name = $2 AND ur.scope = 'COMPANY'`,
        [user.id, user.role_name]
      );

      if (roleRes.rowCount === 0) {
        throw unauthorized('User does not have required role');
      }

      // STEP 1 — Fetch permissions for the admin user
      const permsRes = await pool.query(
        `SELECT
           u.id as user_id,
           r.name as role_name,
           p.code as permission_code
         FROM admin_user u
         JOIN user_role ur ON ur.user_id = u.id
         JOIN role r ON r.id = ur.role_id
         LEFT JOIN role_permission rp ON rp.role_id = r.id
         LEFT JOIN permission p ON p.id = rp.permission_id
         WHERE u.id = $1`,
        [user.id]
      );

      // STEP 2 — Transform result
      const permissions = [...new Set(permsRes.rows.map(r => r.permission_code).filter(Boolean))];
      const role = permsRes.rows[0]?.role_name || user.role_name;

      // STEP 3 — Create JWT payload with permissions
      const token = jwt.sign(
        {
          sub: user.id,
          role,
          permissions
        },
        config.jwt.secret,
        {
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
          expiresIn: config.security.accessTokenExpiresIn
        }
      );

      const refresh = await refreshSvc.issueRefreshToken({
        subjectType: 'ADMIN_USER',
        subjectId: user.id,
        ttlMs: config.security.refreshTokenTtlMs,
        userAgent: req.header('user-agent') || null,
        ip: req.ip
      });

      const secure = String(config.security.refreshCookieSecure || '').toLowerCase() === 'true'
        ? true
        : config.nodeEnv === 'production';

      res.cookie(config.security.refreshCookieName || 'jasiq_refresh', refresh.token, {
        httpOnly: true,
        secure,
        sameSite: config.security.refreshCookieSameSite || 'lax',
        path: '/api/v1/auth',
        maxAge: config.security.refreshTokenTtlMs
      });

      // Audit log the login
      await writeAuditLog(pool, {
        requestId: req.requestId,
        entityType: 'ADMIN_USER',
        entityId: user.id,
        action: 'ADMIN_LOGIN',
        beforeData: null,
        afterData: { email: user.email, role: user.role_name },
        actorId: user.id,
        actorRole: user.role_name,
        reason: 'Admin login via /api/v1/auth/admin/login'
      });

      res.json({ accessToken: token });
    })
  };
}
