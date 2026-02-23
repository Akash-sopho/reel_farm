import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  err: ApiError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const error = err as ApiError;
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';

  const message = error.message || 'An unexpected error occurred';
  const details = error.details || {};

  console.error(`[${code}] ${message}`, details);

  res.status(statusCode).json({
    error: message,
    code,
    details,
  });
};

export class HttpError extends Error implements ApiError {
  statusCode: number;
  code: string;
  details: unknown;

  constructor(
    statusCode: number,
    message: string,
    code: string = 'HTTP_ERROR',
    details: unknown = {}
  ) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
