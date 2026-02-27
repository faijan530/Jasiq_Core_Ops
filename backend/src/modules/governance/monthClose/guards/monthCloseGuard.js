import { monthClosed, badRequest } from '../../../../shared/kernel/errors.js';

function toIsoDateOnly(value) {
  if (!value) throw badRequest('Invalid month');

  const raw = String(value).trim();
  if (!raw) throw badRequest('Invalid month');

  if (/^\d{4}-\d{2}$/.test(raw)) {
    return `${raw}-01`;
  }

  const s = raw.includes('T') ? raw.slice(0, 10) : raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw badRequest('Invalid month');
  return s;
}

function monthStartIso(value) {
  const d = new Date(`${toIsoDateOnly(value)}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw badRequest('Invalid month');
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  return start.toISOString().slice(0, 10);
}

export async function ensureMonthOpen(monthDate, db) {
  const month = monthStartIso(monthDate);

  const res = await db.query(
    `SELECT status
     FROM month_close
     WHERE scope = 'COMPANY' AND month::date = $1::date
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [month]
  );

  const status = String(res.rows[0]?.status || 'OPEN').toUpperCase();
  if (status === 'CLOSED') throw monthClosed();
}
