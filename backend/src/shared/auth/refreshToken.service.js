import crypto from 'node:crypto';

import { withTransaction } from '../persistence/transaction.js';
import { badRequest, unauthorized } from '../kernel/errors.js';

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function randomToken() {
  // 256-bit random token (base64url)
  return crypto.randomBytes(32).toString('base64url');
}

export function refreshTokenService({ pool }) {
  async function issueRefreshToken({ subjectType, subjectId, userId, userAgent, ip, ttlMs }) {
    // Backward compatible signature: userId is the subjectId for USER.
    const resolvedSubjectType = subjectType || 'USER';
    const resolvedSubjectId = subjectId || userId;

    if (!resolvedSubjectId) throw badRequest('Missing subjectId');

    const token = randomToken();
    const tokenHash = sha256Hex(token);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + ttlMs);

    await pool.query(
      `INSERT INTO auth_refresh_token (subject_type, subject_id, family_id, token_hash, expires_at, user_agent, ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [resolvedSubjectType, resolvedSubjectId, familyId, tokenHash, expiresAt.toISOString(), userAgent || null, ip || null]
    );

    return { token, familyId, expiresAt };
  }

  async function rotateRefreshToken({ token, userAgent, ip, ttlMs }) {
    const raw = String(token || '').trim();
    if (!raw) throw badRequest('Missing refresh token');

    const tokenHash = sha256Hex(raw);

    return withTransaction(pool, async (client) => {
      // Lock row to avoid concurrent rotations.
      const res = await client.query(
        `SELECT id, subject_type, subject_id, family_id, revoked_at, expires_at
         FROM auth_refresh_token
         WHERE token_hash = $1
         FOR UPDATE`,
        [tokenHash]
      );

      if (res.rowCount === 0) throw unauthorized('Invalid refresh token');

      const row = res.rows[0];
      if (row.revoked_at) throw unauthorized('Refresh token revoked');

      const exp = new Date(row.expires_at);
      if (Number.isNaN(exp.getTime()) || exp.getTime() <= Date.now()) {
        throw unauthorized('Refresh token expired');
      }

      const subjectType = row.subject_type;
      const subjectId = row.subject_id;
      if (!subjectType || !subjectId) throw unauthorized('Invalid refresh token');

      // Create next token
      const nextToken = randomToken();
      const nextHash = sha256Hex(nextToken);
      const nextExpiresAt = new Date(Date.now() + ttlMs);

      const insertRes = await client.query(
        `INSERT INTO auth_refresh_token (subject_type, subject_id, family_id, token_hash, expires_at, user_agent, ip)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id`,
        [subjectType, subjectId, row.family_id, nextHash, nextExpiresAt.toISOString(), userAgent || null, ip || null]
      );

      const nextId = insertRes.rows[0].id;

      // Revoke current and link
      await client.query(
        `UPDATE auth_refresh_token
         SET revoked_at = NOW(), replaced_by_token_id = $2, last_used_at = NOW()
         WHERE id = $1`,
        [row.id, nextId]
      );

      return { token: nextToken, expiresAt: nextExpiresAt, familyId: row.family_id, subjectType, subjectId };
    });
  }

  async function revokeRefreshToken({ token }) {
    const raw = String(token || '').trim();
    if (!raw) return { revoked: false };

    const tokenHash = sha256Hex(raw);
    const res = await pool.query(
      `UPDATE auth_refresh_token
       SET revoked_at = NOW(), last_used_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash]
    );

    return { revoked: res.rowCount > 0 };
  }

  return {
    issueRefreshToken,
    rotateRefreshToken,
    revokeRefreshToken
  };
}
