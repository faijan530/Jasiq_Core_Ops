import { logInfo } from '../kernel/logger.js';

export function requestLogMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    logInfo('http_request', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
      userId: req.auth?.userId
    });
  });

  next();
}
