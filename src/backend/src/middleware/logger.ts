import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';

// Custom morgan token for request ID
morgan.token('id', (req: Request) => {
  return (req as any).id || '-';
});

// Morgan middleware with custom format
export const logger = morgan(
  ':id :method :url :status :res[content-length] - :response-time ms'
);
