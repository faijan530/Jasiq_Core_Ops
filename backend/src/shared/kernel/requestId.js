import crypto from 'node:crypto';

export function requestIdMiddleware(req, res, next) {
  const incoming = req.header('x-request-id');
  const requestId = incoming && String(incoming).slice(0, 60);
  req.requestId = requestId || crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}
