import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse } from '../utils/response';

export class ErrorHandler extends Error {
  statusCode: number;
  errors?: any[];

  constructor(message: string, statusCode: number = 500, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorMiddleware = (
  error: ErrorHandler,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  const errors = error.errors || [];

  // Log error
  logger.error(`[${req.method}] ${req.path} >> StatusCode:: ${statusCode}, Message:: ${message}`);

  // Send error response
  return ApiResponse.error(res, message, statusCode, errors);
};