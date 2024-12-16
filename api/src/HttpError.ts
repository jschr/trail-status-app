import { STATUS_CODES } from 'http';

const statusCodes = Object.keys(STATUS_CODES).map(statusCode =>
  parseInt(statusCode, 10),
);

class HttpError extends Error {
  public statusCode: number;
  public originalError: unknown | undefined;

  constructor(
    statusCode: number,
    message = STATUS_CODES[statusCode],
    originalError?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.originalError = originalError;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const isHttpError = (err: any): err is HttpError =>
  err &&
  typeof err === 'object' &&
  'statusCode' in err &&
  statusCodes.includes(err.statusCode);

export class BadRequestError extends HttpError {
  constructor(message?: string, originalError?: unknown) {
    super(400, message, originalError);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message?: string, originalError?: unknown) {
    super(401, message, originalError);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends HttpError {
  constructor(message?: string, originalError?: unknown) {
    super(404, message, originalError);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InternalServerError extends HttpError {
  constructor(originalError?: unknown) {
    super(500, 'Internal Server Error', originalError);
    Error.captureStackTrace(this, this.constructor);
  }
}
