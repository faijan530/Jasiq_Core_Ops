import crypto from 'node:crypto';
import { internal } from './errors.js';

function deepCloneSafe(data) {
  if (data === null || data === undefined) return data;
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
}

function maskStringValue(key, value) {
  const k = String(key || '').toLowerCase();
  const v = value;
  if (v === null || v === undefined) return v;

  if (k.includes('token') || k.includes('secret') || k.includes('password') || k.includes('otp')) {
    return '[REDACTED]';
  }

  if (k.includes('bank') || k.includes('account') || k.includes('ifsc')) {
    const s = String(v);
    const digits = s.replace(/\D/g, '');
    if (digits.length >= 4) return `****${digits.slice(-4)}`;
    return '****';
  }

  if (k.includes('salary') || k.includes('ctc') || k.includes('compensation')) {
    return '[MASKED]';
  }

  if (k.includes('url') || k.includes('storage') || k.includes('document')) {
    const s = String(v);
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return '[MASKED]';
  }

  return v;
}

function maskObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((x) => maskObject(x));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') {
      out[k] = maskObject(v);
    } else {
      out[k] = maskStringValue(k, v);
    }
  }
  return out;
}

function scrubAuditData(entityType, data) {
  if (!data) return null;
  const masked = maskObject(deepCloneSafe(data));
  if (entityType !== 'system_config') return masked;

  const key = String(masked.key || '');
  const upper = key.toUpperCase();
  if (upper.includes('SECRET') || upper.includes('PASSWORD') || upper.includes('TOKEN')) {
    return { ...masked, value: '[REDACTED]' };
  }

  return masked;
}

export async function writeAuditLog(client, {
  requestId,
  correlationId,
  entityType,
  entityId,
  action,
  severity,
  scope,
  divisionId,
  beforeData,
  afterData,
  meta,
  actorId,
  actorRole,
  actorRoles,
  actorEmail,
  reason
}) {
  const id = crypto.randomUUID();

  try {
    await client.query(
      `INSERT INTO audit_log (
        id, request_id, correlation_id,
        entity_type, entity_id, action,
        severity, scope, division_id,
        before_data, after_data,
        meta,
        actor_id, actor_role, actor_roles, actor_email,
        reason, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())`,
      [
        id,
        requestId,
        correlationId || null,
        entityType,
        entityId || null,
        action,
        String(severity || 'MEDIUM').toUpperCase(),
        scope || null,
        divisionId || null,
        scrubAuditData(entityType, beforeData),
        scrubAuditData(entityType, afterData),
        scrubAuditData(entityType, meta),
        actorId,
        actorRole || null,
        Array.isArray(actorRoles) ? actorRoles : actorRoles ? [actorRoles] : null,
        actorEmail || null,
        reason || null
      ]
    );

    return id;
  } catch {
    throw internal('Audit logging failed');
  }
}
