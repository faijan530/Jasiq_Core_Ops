import Joi from 'joi';
import jwt from 'jsonwebtoken';

import { asyncHandler } from '../kernel/asyncHandler.js';
import { validate } from '../kernel/validation.js';
import { config } from '../kernel/config.js';
import { unauthorized } from '../kernel/errors.js';
import { refreshTokenService } from './refreshToken.service.js';

const refreshSchema = Joi.object({}).unknown(true);

function issueAccessToken({ userId, role, permissions, expiresIn }) {
  return jwt.sign(
    {
      sub: userId,
      role: role || null,
      permissions: Array.isArray(permissions) ? permissions : []
    },
    config.jwt.secret,
    {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      expiresIn
    }
  );
}

function getRefreshCookieName() {
  return config.security.refreshCookieName || 'jasiq_refresh';
}

function readCookie(req, name) {
  const raw = String(req.header('cookie') || '');
  if (!raw) return null;
  const parts = raw.split(';').map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k !== name) continue;
    return decodeURIComponent(part.slice(idx + 1));
  }
  return null;
}

function setRefreshCookie(res, token, { maxAgeMs }) {
  const secure = String(config.security.refreshCookieSecure || '').toLowerCase() === 'true'
    ? true
    : config.nodeEnv === 'production';

  res.cookie(getRefreshCookieName(), token, {
    httpOnly: true,
    secure,
    sameSite: config.security.refreshCookieSameSite || 'lax',
    path: '/api/v1/auth',
    maxAge: maxAgeMs
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(getRefreshCookieName(), {
    path: '/api/v1/auth'
  });
}

export function refreshTokenController({ pool }) {
  const svc = refreshTokenService({ pool });

  return {
    refresh: asyncHandler(async (req, res) => {
      validate(refreshSchema, req.body || {});

      const refreshToken = readCookie(req, getRefreshCookieName());
      if (!refreshToken) throw unauthorized('Missing refresh token');

      const rotated = await svc.rotateRefreshToken({
        token: refreshToken,
        userAgent: req.header('user-agent') || null,
        ip: req.ip,
        ttlMs: config.security.refreshTokenTtlMs
      });

      const subjectType = rotated.subjectType;
      const subjectId = rotated.subjectId;
      if (!subjectType || !subjectId) throw unauthorized('Invalid refresh token');

      // Load current role + permissions from DB (do not rely only on JWT claims)
      const permsRes = await pool.query(
        `SELECT r.name as role_name, p.code as permission_code
         FROM user_role ur
         JOIN role r ON r.id = ur.role_id
         LEFT JOIN role_permission rp ON rp.role_id = r.id
         LEFT JOIN permission p ON p.id = rp.permission_id
         WHERE ur.user_id = $1`,
        [subjectId]
      );
      const permissions = [...new Set(permsRes.rows.map((r) => r.permission_code).filter(Boolean))];
      const role = permsRes.rows[0]?.role_name || 'EMPLOYEE';

      const accessToken = issueAccessToken({
        userId: subjectId,
        role,
        permissions,
        expiresIn: config.security.accessTokenExpiresIn
      });

      setRefreshCookie(res, rotated.token, { maxAgeMs: config.security.refreshTokenTtlMs });

      res.json({ accessToken });
    }),

    logout: asyncHandler(async (req, res) => {
      validate(refreshSchema, req.body || {});

      const refreshToken = readCookie(req, getRefreshCookieName());
      if (!refreshToken) {
        clearRefreshCookie(res);
        res.status(204).send();
        return;
      }

      await svc.revokeRefreshToken({ token: refreshToken });
      clearRefreshCookie(res);
      res.status(204).send();
    })
  };
}
