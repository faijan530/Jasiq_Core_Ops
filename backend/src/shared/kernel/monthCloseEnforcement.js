import { forbidden } from './errors.js';

function monthStart(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return d;
}

export function monthCloseEnforcementMiddleware({ pool, isEnabledFn, isExemptPathFn }) {
  return async function middleware(req, res, next) {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      next();
      return;
    }

    if (isExemptPathFn && isExemptPathFn(req)) {
      next();
      return;
    }

    const enabled = await isEnabledFn(pool);
    if (!enabled) {
      next();
      return;
    }

    const now = new Date();
    const month = monthStart(now);

    const resDb = await pool.query(
      'SELECT status FROM month_close WHERE month = $1 AND scope = $2',
      [month.toISOString().slice(0, 10), 'COMPANY']
    );

    const status = resDb.rows[0]?.status || 'OPEN';
    if (status === 'CLOSED') {
      next(forbidden('Month is closed'));
      return;
    }

    next();
  };
}
