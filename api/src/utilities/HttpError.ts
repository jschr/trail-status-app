import { STATUS_CODES } from 'http';

const statusCodes = Object.keys(STATUS_CODES).map(statusCode =>
  parseInt(statusCode, 10)
);

class HttpError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message = STATUS_CODES[statusCode]) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const isHttpError = (err: any): err is HttpError =>
  err &&
  typeof err === 'object' &&
  'statusCode' in err &&
  statusCodes.includes(err.statusCode);

export class BadRequestError extends HttpError {
  constructor(message?: string) {
    super(400, message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message?: string) {
    super(401, message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends HttpError {
  constructor(message?: string) {
    super(404, message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InternalServerError extends HttpError {
  constructor() {
    super(500);
    Error.captureStackTrace(this, this.constructor);
  }
}
