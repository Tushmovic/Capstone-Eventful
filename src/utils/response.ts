import { Response } from 'express';

export class ApiResponse {
  static success(
    res: Response,
    data: any,
    message: string = 'Success',
    statusCode: number = 200
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(
    res: Response,
    message: string = 'Internal Server Error',
    statusCode: number = 500,
    errors?: any[]
  ) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors: errors || [],
    });
  }

  static created(res: Response, data: any, message: string = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static notFound(res: Response, message: string = 'Resource not found') {
    return this.error(res, message, 404);
  }

  static badRequest(res: Response, message: string = 'Bad Request', errors?: any[]) {
    return this.error(res, message, 400, errors);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message: string = 'Forbidden') {
    return this.error(res, message, 403);
  }

  static conflict(res: Response, message: string = 'Conflict') {
    return this.error(res, message, 409);
  }
}