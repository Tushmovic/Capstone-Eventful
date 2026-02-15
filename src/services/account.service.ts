import Account from '../models/Account.model';
import User from '../models/User.model';
import { ICreateAccountInput, ISwitchAccountInput, IAccountResponse } from '../interfaces/account.interface';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';

export class AccountService {
  /**
   * Create a new account for a user with a different role
   */
  async createAccount(data: ICreateAccountInput): Promise<IAccountResponse> {
    try {
      // Check if account with this role already exists for this user
      const existingAccount = await Account.findOne({
        user: data.userId,
        role: data.role
      });

      if (existingAccount) {
        throw new Error(`You already have a ${data.role} account`);
      }

      // Create new account
      const account = new Account({
        user: data.userId,
        name: data.name,
        email: data.email,
        role: data.role,
        profileImage: data.profileImage || 'https://res.cloudinary.com/demo/image/upload/v1674576809/default-avatar.png',
        isActive: false,
      });

      await account.save();

      logger.info(`✅ New ${data.role} account created for user ${data.userId}`);

      return {
        _id: account._id.toString(),
        name: account.name,
        email: account.email,
        role: account.role,
        profileImage: account.profileImage,
        isActive: account.isActive,
      };
    } catch (error: any) {
      logger.error(`❌ Create account error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all accounts for a user
   */
  async getUserAccounts(userId: string): Promise<IAccountResponse[]> {
    try {
      const cacheKey = `accounts:${userId}`;
      
      // Try cache first
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch (cacheError) {
        logger.warn(`⚠️ Cache read failed for accounts of user ${userId}`);
      }

      // Get from database
      const accounts = await Account.find({ user: userId }).lean();

      const formattedAccounts = accounts.map(account => ({
        _id: account._id.toString(),
        name: account.name,
        email: account.email,
        role: account.role,
        profileImage: account.profileImage,
        isActive: account.isActive,
      }));

      // Store in cache
      try {
        await redisClient.set(cacheKey, JSON.stringify(formattedAccounts), 300); // 5 minutes
      } catch (cacheError) {
        logger.warn(`⚠️ Cache write failed for accounts of user ${userId}`);
      }

      return formattedAccounts;
    } catch (error: any) {
      logger.error(`❌ Get user accounts error: ${error.message}`);
      return [];
    }
  }

  /**
   * Switch to a different account
   */
  async switchAccount(data: ISwitchAccountInput): Promise<IAccountResponse> {
    try {
      // Deactivate all accounts for this user
      await Account.updateMany(
        { user: data.userId },
        { $set: { isActive: false } }
      );

      // Activate the selected account
      const account = await Account.findOneAndUpdate(
        { _id: data.accountId, user: data.userId },
        { $set: { isActive: true } },
        { new: true }
      );

      if (!account) {
        throw new Error('Account not found');
      }

      // Also update the main User document's role
      await User.findByIdAndUpdate(
        data.userId,
        { $set: { role: account.role } }
      );

      // Clear cache
      await redisClient.del(`accounts:${data.userId}`);

      logger.info(`✅ User ${data.userId} switched to ${account.role} account`);

      return {
        _id: account._id.toString(),
        name: account.name,
        email: account.email,
        role: account.role,
        profileImage: account.profileImage,
        isActive: account.isActive,
      };
    } catch (error: any) {
      logger.error(`❌ Switch account error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the active account for a user
   */
  async getActiveAccount(userId: string): Promise<IAccountResponse | null> {
    try {
      const account = await Account.findOne({ user: userId, isActive: true }).lean();

      if (!account) {
        return null;
      }

      return {
        _id: account._id.toString(),
        name: account.name,
        email: account.email,
        role: account.role,
        profileImage: account.profileImage,
        isActive: account.isActive,
      };
    } catch (error: any) {
      logger.error(`❌ Get active account error: ${error.message}`);
      return null;
    }
  }

  /**
   * Initialize default accounts for a new user
   */
  async initializeUserAccounts(userId: string, userData: any): Promise<void> {
    try {
      // Create the account that matches the user's registered role
      const account = new Account({
        user: userId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        profileImage: userData.profileImage || 'https://res.cloudinary.com/demo/image/upload/v1674576809/default-avatar.png',
        isActive: true, // Make this the active account
      });

      await account.save();
      logger.info(`✅ Initial account created for user ${userId}`);
    } catch (error: any) {
      logger.error(`❌ Initialize accounts error: ${error.message}`);
    }
  }
}

export const accountService = new AccountService();