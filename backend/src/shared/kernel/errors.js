export class AppError extends Error {
  constructor({ code, message, status, details }) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function badRequest(message, details) {
  return new AppError({ code: 'BAD_REQUEST', message, status: 400, details });
}

export function unauthorized(message = 'Unauthorized') {
  return new AppError({ code: 'UNAUTHORIZED', message, status: 401 });
}

export function forbidden(message = 'Forbidden') {
  return new AppError({ code: 'FORBIDDEN', message, status: 403 });
}

export function monthClosed(message = 'Month is closed') {
  return new AppError({ code: 'MONTH_CLOSED', message, status: 403 });
}

export function notFound(message = 'Not found') {
  return new AppError({ code: 'NOT_FOUND', message, status: 404 });
}

export function conflict(message = 'Conflict', details) {
  return new AppError({ code: 'CONFLICT', message, status: 409, details });
}

export function internal(message = 'Internal server error') {
  return new AppError({ code: 'INTERNAL', message, status: 500 });
}
