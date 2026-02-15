import Wallet, { IWallet } from '../models/Wallet.model';
import Transaction from '../models/Transaction.model';
import User from '../models/User.model';
import { 
  ICreateWalletInput, 
  IWalletResponse, 
  IWalletTransactionInput,
  ITransactionResponse 
} from '../interfaces/wallet.interface';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';

export class WalletService {
  /**
   * Create a wallet for a user (called on registration)
   */
  async createWallet(userId: string): Promise<IWalletResponse> {
    try {
      // Check if wallet already exists
      const existingWallet = await Wallet.findOne({ user: userId });
      if (existingWallet) {
        return this.formatWalletResponse(existingWallet);
      }

      // Create new wallet
      const wallet = new Wallet({
        user: userId,
        balance: 0,
        currency: 'NGN',
        isActive: true,
        lastTransactionAt: new Date(),
      });

      await wallet.save();

      logger.info(`✅ Wallet created for user: ${userId}`);

      return this.formatWalletResponse(wallet);
    } catch (error: any) {
      logger.error(`❌ Create wallet error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get wallet by user ID
   */
  async getWalletByUserId(userId: string): Promise<IWalletResponse | null> {
    try {
      const cacheKey = `wallet:${userId}`;
      
      // Try cache first
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        logger.warn(`⚠️ Cache read failed for wallet of user ${userId}`);
      }

      const wallet = await Wallet.findOne({ user: userId });
      
      if (!wallet) {
        // Create wallet if it doesn't exist
        return await this.createWallet(userId);
      }

      const response = this.formatWalletResponse(wallet);

      // Store in cache
      try {
        await redisClient.set(cacheKey, JSON.stringify(response), 300); // 5 minutes
      } catch (cacheError) {
        logger.warn(`⚠️ Cache write failed for wallet of user ${userId}`);
      }

      return response;
    } catch (error: any) {
      logger.error(`❌ Get wallet error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Credit wallet (add money)
   */
  async creditWallet(data: IWalletTransactionInput): Promise<ITransactionResponse> {
    try {
      const { userId, amount, description, reference, metadata, relatedTicket, relatedEvent } = data;

      // Validate amount
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Get wallet
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (!wallet.isActive) {
        throw new Error('Wallet is inactive');
      }

      // Generate reference if not provided
      const transactionReference = reference || `CRD-${uuidv4()}`;

      // Calculate new balance
      const newBalance = wallet.balance + amount;

      // Update wallet
      wallet.balance = newBalance;
      wallet.lastTransactionAt = new Date();
      await wallet.save();

      // Create transaction record
      const transaction = new Transaction({
        wallet: wallet._id,
        user: userId,
        type: 'credit',
        amount,
        balance: newBalance,
        description,
        reference: transactionReference,
        status: 'completed',
        metadata,
        relatedTicket,
        relatedEvent,
      });

      await transaction.save();

      // Clear cache
      await redisClient.del(`wallet:${userId}`);
      await redisClient.del(`transactions:${userId}`);

      logger.info(`✅ Wallet credited: ₦${amount} for user ${userId}`);

      return this.formatTransactionResponse(transaction);
    } catch (error: any) {
      logger.error(`❌ Credit wallet error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Debit wallet (spend money)
   */
  async debitWallet(data: IWalletTransactionInput): Promise<ITransactionResponse> {
    try {
      const { userId, amount, description, reference, metadata, relatedTicket, relatedEvent } = data;

      // Validate amount
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Get wallet
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (!wallet.isActive) {
        throw new Error('Wallet is inactive');
      }

      // Check sufficient balance
      if (wallet.balance < amount) {
        throw new Error(`Insufficient balance. Available: ₦${wallet.balance}, Required: ₦${amount}`);
      }

      // Generate reference if not provided
      const transactionReference = reference || `DBT-${uuidv4()}`;

      // Calculate new balance
      const newBalance = wallet.balance - amount;

      // Update wallet
      wallet.balance = newBalance;
      wallet.lastTransactionAt = new Date();
      await wallet.save();

      // Create transaction record
      const transaction = new Transaction({
        wallet: wallet._id,
        user: userId,
        type: 'debit',
        amount,
        balance: newBalance,
        description,
        reference: transactionReference,
        status: 'completed',
        metadata,
        relatedTicket,
        relatedEvent,
      });

      await transaction.save();

      // Clear cache
      await redisClient.del(`wallet:${userId}`);
      await redisClient.del(`transactions:${userId}`);

      logger.info(`✅ Wallet debited: ₦${amount} for user ${userId}`);

      return this.formatTransactionResponse(transaction);
    } catch (error: any) {
      logger.error(`❌ Debit wallet error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process refund to wallet
   */
  async refundWallet(data: IWalletTransactionInput): Promise<ITransactionResponse> {
    try {
      const { userId, amount, description, reference, metadata, relatedTicket, relatedEvent } = data;

      // Validate amount
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Get wallet
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (!wallet.isActive) {
        throw new Error('Wallet is inactive');
      }

      // Generate reference if not provided
      const transactionReference = reference || `REF-${uuidv4()}`;

      // Calculate new balance
      const newBalance = wallet.balance + amount;

      // Update wallet
      wallet.balance = newBalance;
      wallet.lastTransactionAt = new Date();
      await wallet.save();

      // Create transaction record
      const transaction = new Transaction({
        wallet: wallet._id,
        user: userId,
        type: 'refund',
        amount,
        balance: newBalance,
        description,
        reference: transactionReference,
        status: 'completed',
        metadata,
        relatedTicket,
        relatedEvent,
      });

      await transaction.save();

      // Clear cache
      await redisClient.del(`wallet:${userId}`);
      await redisClient.del(`transactions:${userId}`);

      logger.info(`✅ Wallet refunded: ₦${amount} for user ${userId}`);

      return this.formatTransactionResponse(transaction);
    } catch (error: any) {
      logger.error(`❌ Refund wallet error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId: string, page: number = 1, limit: number = 20): Promise<{
    transactions: ITransactionResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const cacheKey = `transactions:${userId}:${page}:${limit}`;
      
      // Try cache first
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        logger.warn(`⚠️ Cache read failed for transactions of user ${userId}`);
      }

      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        Transaction.find({ user: userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Transaction.countDocuments({ user: userId }),
      ]);

      const formattedTransactions = transactions.map(t => this.formatTransactionResponse(t));

      const response = {
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };

      // Store in cache
      try {
        await redisClient.set(cacheKey, JSON.stringify(response), 300); // 5 minutes
      } catch (cacheError) {
        logger.warn(`⚠️ Cache write failed for transactions of user ${userId}`);
      }

      return response;
    } catch (error: any) {
      logger.error(`❌ Get transaction history error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if user has sufficient balance
   */
  async hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
    try {
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet) return false;
      return wallet.balance >= amount;
    } catch (error: any) {
      logger.error(`❌ Check balance error: ${error.message}`);
      return false;
    }
  }

  /**
   * Transfer money between users
   */
  async transferMoney(fromUserId: string, toUserId: string, amount: number, description: string): Promise<{
    fromTransaction: ITransactionResponse;
    toTransaction: ITransactionResponse;
  }> {
    try {
      // Debit from sender
      const fromTransaction = await this.debitWallet({
        userId: fromUserId,
        amount,
        description: `Transfer: ${description}`,
        reference: `TRF-OUT-${uuidv4()}`,
        metadata: { toUserId },
      });

      // Credit to receiver
      const toTransaction = await this.creditWallet({
        userId: toUserId,
        amount,
        description: `Transfer: ${description}`,
        reference: `TRF-IN-${uuidv4()}`,
        metadata: { fromUserId },
      });

      logger.info(`✅ Transfer completed: ₦${amount} from user ${fromUserId} to user ${toUserId}`);

      return {
        fromTransaction,
        toTransaction,
      };
    } catch (error: any) {
      logger.error(`❌ Transfer money error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format wallet response
   */
  private formatWalletResponse(wallet: any): IWalletResponse {
    return {
      _id: wallet._id.toString(),
      balance: wallet.balance,
      currency: wallet.currency,
      lastTransactionAt: wallet.lastTransactionAt,
    };
  }

  /**
   * Format transaction response
   */
  private formatTransactionResponse(transaction: any): ITransactionResponse {
    return {
      _id: transaction._id.toString(),
      type: transaction.type,
      amount: transaction.amount,
      balance: transaction.balance,
      description: transaction.description,
      reference: transaction.reference,
      status: transaction.status,
      createdAt: transaction.createdAt,
    };
  }
}

export const walletService = new WalletService();