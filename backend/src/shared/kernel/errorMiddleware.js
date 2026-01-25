import { AppError } from './errors.js';
import { logError } from './logger.js';

export function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  const requestId = req.requestId;

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId
      }
    });
    return;
  }

  logError('unhandled_error', {
    requestId,
    path: req.originalUrl,
    method: req.method,
    message: err?.message,
    stack: err?.stack
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'Internal server error',
      requestId
    }
  });
}
