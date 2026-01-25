import crypto from 'node:crypto';
import { internal } from './errors.js';

function scrubAuditData(entityType, data) {
  if (!data) return null;
  if (entityType !== 'system_config') return data;

  const key = String(data.key || '');
  const upper = key.toUpperCase();
  if (upper.includes('SECRET') || upper.includes('PASSWORD') || upper.includes('TOKEN')) {
    return { ...data, value: '[REDACTED]' };
  }

  return data;
}

export async function writeAuditLog(client, {
  requestId,
  entityType,
  entityId,
  action,
  beforeData,
  afterData,
  actorId,
  actorRole,
  reason
}) {
  const id = crypto.randomUUID();

  try {
    await client.query(
      `INSERT INTO audit_log (
        id, request_id, entity_type, entity_id, action,
        before_data, after_data,
        actor_id, actor_role, reason, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
      [
        id,
        requestId,
        entityType,
        entityId || null,
        action,
        scrubAuditData(entityType, beforeData),
        scrubAuditData(entityType, afterData),
        actorId,
        actorRole || null,
        reason || null
      ]
    );

    return id;
  } catch {
    throw internal('Audit logging failed');
  }
}
