import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { ApiResponse } from '../utils/response';
import { validateRequest } from '../middlewares/validation.middleware';
import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema, 
  changePasswordSchema, 
  updateProfileSchema 
} from '../dtos/auth.dto';
import { logger } from '../utils/logger';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const userData = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        role: req.body.role,
        phoneNumber: req.body.phoneNumber,
        profileImage: req.body.profileImage,
      };

      const result = await authService.register(userData);
      
      logger.info(`New user registered: ${userData.email}`);
      return ApiResponse.created(res, result, 'Registration successful');
    } catch (error: any) {
      logger.error(`Registration controller error: ${error.message}`);
      
      if (error.message.includes('already exists')) {
        return ApiResponse.conflict(res, error.message);
      }
      if (error.message.includes('validation failed')) {
        return ApiResponse.badRequest(res, error.message);
      }
      
      return ApiResponse.error(res, 'Registration failed');
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      
      logger.info(`User logged in: ${email}`);
      return ApiResponse.success(res, result, 'Login successful');
    } catch (error: any) {
      logger.error(`Login controller error: ${error.message}`);
      
      if (error.message.includes('Invalid email or password')) {
        return ApiResponse.unauthorized(res, 'Invalid credentials');
      }
      if (error.message.includes('verify your email')) {
        return ApiResponse.unauthorized(res, error.message);
      }
      
      return ApiResponse.error(res, 'Login failed');
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const user = await authService.getProfile(userId);
      
      return ApiResponse.success(res, user, 'Profile retrieved successfully');
    } catch (error: any) {
      logger.error(`Get profile controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get profile');
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const updates = req.body;
      
      const updatedUser = await authService.updateProfile(userId, updates);
      
      logger.info(`Profile updated for user: ${userId}`);
      return ApiResponse.success(res, updatedUser, 'Profile updated successfully');
    } catch (error: any) {
      logger.error(`Update profile controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to update profile');
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { currentPassword, newPassword } = req.body;
      
      await authService.changePassword(userId, currentPassword, newPassword);
      
      logger.info(`Password changed for user: ${userId}`);
      return ApiResponse.success(res, null, 'Password changed successfully');
    } catch (error: any) {
      logger.error(`Change password controller error: ${error.message}`);
      
      if (error.message.includes('Current password is incorrect')) {
        return ApiResponse.badRequest(res, error.message);
      }
      
      return ApiResponse.error(res, 'Failed to change password');
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);
      
      return ApiResponse.success(res, tokens, 'Token refreshed successfully');
    } catch (error: any) {
      logger.error(`Refresh token controller error: ${error.message}`);
      return ApiResponse.unauthorized(res, 'Invalid refresh token');
    }
  }

  async logout(req: Request, res: Response) {
    try {
      // In production, we would invalidate the refresh token in Redis
      // For now, just return success
      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error: any) {
      logger.error(`Logout controller error: ${error.message}`);
      return ApiResponse.error(res, 'Logout failed');
    }
  }
}

export const authController = new AuthController();