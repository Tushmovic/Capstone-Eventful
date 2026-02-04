import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { constants } from '../config/constants';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const authMiddleware = (requiredRoles: string[] = []) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ApiResponse.unauthorized(res, 'No token provided');
      }

      const token = authHeader.split(' ')[1];

      // Verify token
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
          return ApiResponse.unauthorized(res, 'Token expired');
        }
        if (error.name === 'JsonWebTokenError') {
          return ApiResponse.unauthorized(res, 'Invalid token');
        }
        throw error;
      }

      // Check if user has required role
      if (requiredRoles.length > 0 && !requiredRoles.includes(decoded.role)) {
        return ApiResponse.forbidden(res, 'Insufficient permissions');
      }

      // Attach user to request
      (req as any).user = {
        userId: decoded.userId,
        role: decoded.role,
      };

      next();
    } catch (error: any) {
      logger.error(`Auth middleware error: ${error.message}`);
      return ApiResponse.unauthorized(res, 'Authentication failed');
    }
  };
};

// Convenience middlewares for specific roles
export const creatorOnly = authMiddleware([constants.ROLES.CREATOR]);
export const eventeeOnly = authMiddleware([constants.ROLES.EVENTEE]);
export const adminOnly = authMiddleware([constants.ROLES.ADMIN]);
export const creatorOrAdmin = authMiddleware([constants.ROLES.CREATOR, constants.ROLES.ADMIN]);
export const authenticated = authMiddleware([]); // Any authenticated user