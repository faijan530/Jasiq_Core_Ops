import crypto from 'node:crypto';

import { badRequest, forbidden } from '../../../shared/kernel/errors.js';
import { config } from '../../../shared/kernel/config.js';

function base64UrlEncode(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  const s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s + pad, 'base64');
}

function sign(data) {
  return crypto.createHmac('sha256', String(config.jwt.secret)).update(data).digest();
}

export function issueReportExportToken({ relPath, fileName, expEpochMs, actorId }) {
  const payload = {
    relPath,
    fileName,
    exp: expEpochMs,
    actorId
  };

  const data = Buffer.from(JSON.stringify(payload), 'utf8');
  const sig = sign(data);

  return `${base64UrlEncode(data)}.${base64UrlEncode(sig)}`;
}

export function verifyReportExportToken(token, { actorId }) {
  const raw = String(token || '').trim();
  const parts = raw.split('.');
  if (parts.length !== 2) throw badRequest('Invalid token');

  const data = base64UrlDecode(parts[0]);
  const sig = base64UrlDecode(parts[1]);

  const expected = sign(data);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) {
    throw forbidden();
  }

  let payload;
  try {
    payload = JSON.parse(data.toString('utf8'));
  } catch {
    throw badRequest('Invalid token');
  }

  if (!payload?.relPath || !payload?.fileName || !payload?.exp) throw badRequest('Invalid token');
  if (Number(payload.exp) < Date.now()) throw forbidden('Token expired');
  if (payload.actorId && actorId && String(payload.actorId) !== String(actorId)) throw forbidden();

  return {
    relPath: String(payload.relPath),
    fileName: String(payload.fileName),
    exp: Number(payload.exp)
  };
}
