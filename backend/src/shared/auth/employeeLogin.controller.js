import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';

import { asyncHandler } from '../kernel/asyncHandler.js';
import { validate } from '../kernel/validation.js';
import { config } from '../kernel/config.js';
import { unauthorized } from '../kernel/errors.js';
import { refreshTokenService } from './refreshToken.service.js';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required()
});

function issueAccessToken({ userId, roleName }) {
  return jwt.sign(
    {
      sub: userId,
      role: roleName
    },
    config.jwt.secret,
    {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      expiresIn: '8h'
    }
  );
}

export function employeeLoginController({ pool }) {
  const refreshSvc = refreshTokenService({ pool });

  return {
    login: asyncHandler(async (req, res) => {
      const body = validate(loginSchema, req.body);
      const email = body.email.trim().toLowerCase();
      const password = body.password;

      const userRes = await pool.query(
        `SELECT id, email, password, active, must_change_password
         FROM "user"
         WHERE email = $1`,
        [email]
      );

      if (userRes.rowCount === 0) {
        throw unauthorized('Invalid credentials');
      }

      const user = userRes.rows[0];
      if (!user.active) {
        throw unauthorized('Account is inactive');
      }

      const passwordHash = user.password;
      if (!passwordHash) {
        throw unauthorized('Password not set');
      }

      const match = await bcrypt.compare(password, passwordHash);
      if (!match) {
        throw unauthorized('Invalid credentials');
      }

      // STEP 1 — Fetch permissions for the user
      const permsRes = await pool.query(
        `SELECT
           u.id as user_id,
           r.name as role_name,
           p.code as permission_code
         FROM "user" u
         JOIN user_role ur ON ur.user_id = u.id
         JOIN role r ON r.id = ur.role_id
         LEFT JOIN role_permission rp ON rp.role_id = r.id
         LEFT JOIN permission p ON p.id = rp.permission_id
         WHERE u.id = $1`,
        [user.id]
      );

      // STEP 2 — Transform result
      const permissions = [...new Set(permsRes.rows.map(r => r.permission_code).filter(Boolean))];
      const role = permsRes.rows[0]?.role_name || 'EMPLOYEE';

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
        subjectType: 'USER',
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

      const response = { accessToken: token };
      if (user.must_change_password) {
        response.forcePasswordChange = true;
      }

      res.json(response);
    })
  };
}
