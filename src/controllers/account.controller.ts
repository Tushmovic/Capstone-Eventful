import { Request, Response } from 'express';
import { accountService } from '../services/account.service';
import { ApiResponse } from '../utils/response';
import { logger } from '../utils/logger';

export class AccountController {
  /**
   * Create a new account (different role)
   */
  async createAccount(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { role } = req.body;

      if (!role || !['creator', 'eventee'].includes(role)) {
        return ApiResponse.badRequest(res, 'Valid role is required');
      }

      // Get current user data
      const User = require('../models/User.model').default;
      const user = await User.findById(userId);

      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      const account = await accountService.createAccount({
        userId,
        name: user.name,
        email: user.email,
        role,
        profileImage: user.profileImage,
      });

      return ApiResponse.success(res, account, `${role} account created successfully`);
    } catch (error: any) {
      logger.error(`Create account error: ${error.message}`);
      
      if (error.message.includes('already have')) {
        return ApiResponse.conflict(res, error.message);
      }
      
      return ApiResponse.error(res, 'Failed to create account');
    }
  }

  /**
   * Get all accounts for the current user
   */
  async getMyAccounts(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const accounts = await accountService.getUserAccounts(userId);

      return ApiResponse.success(res, accounts, 'Accounts retrieved successfully');
    } catch (error: any) {
      logger.error(`Get my accounts error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get accounts');
    }
  }

  /**
   * Switch to a different account
   */
  async switchAccount(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { accountId, role } = req.body;

      if (!accountId || !role) {
        return ApiResponse.badRequest(res, 'Account ID and role are required');
      }

      const account = await accountService.switchAccount({
        userId,
        accountId,
        role,
      });

      return ApiResponse.success(res, account, `Switched to ${role} account`);
    } catch (error: any) {
      logger.error(`Switch account error: ${error.message}`);
      
      if (error.message.includes('not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      
      return ApiResponse.error(res, 'Failed to switch account');
    }
  }

  /**
   * Get active account
   */
  async getActiveAccount(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const account = await accountService.getActiveAccount(userId);

      if (!account) {
        return ApiResponse.notFound(res, 'No active account found');
      }

      return ApiResponse.success(res, account, 'Active account retrieved');
    } catch (error: any) {
      logger.error(`Get active account error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get active account');
    }
  }
}

export const accountController = new AccountController();