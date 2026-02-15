import { Request, Response } from 'express';
import { walletService } from '../services/wallet.service';
import { ApiResponse } from '../utils/response';
import { logger } from '../utils/logger';

export class WalletController {
  /**
   * Get wallet balance for current user
   */
  async getWallet(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      
      const wallet = await walletService.getWalletByUserId(userId);
      
      return ApiResponse.success(res, wallet, 'Wallet retrieved successfully');
    } catch (error: any) {
      logger.error(`Get wallet error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get wallet');
    }
  }

  /**
   * Get transaction history for current user
   */
  async getTransactions(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const transactions = await walletService.getTransactionHistory(userId, page, limit);
      
      return ApiResponse.success(res, transactions, 'Transactions retrieved successfully');
    } catch (error: any) {
      logger.error(`Get transactions error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get transactions');
    }
  }

  /**
   * Credit wallet (add funds)
   */
  async creditWallet(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { amount, description, reference } = req.body;

      if (!amount || amount <= 0) {
        return ApiResponse.badRequest(res, 'Valid amount is required');
      }

      const transaction = await walletService.creditWallet({
        userId,
        amount,
        description: description || 'Wallet credit',
        reference,
      });

      return ApiResponse.success(res, transaction, 'Wallet credited successfully');
    } catch (error: any) {
      logger.error(`Credit wallet error: ${error.message}`);
      return ApiResponse.error(res, error.message || 'Failed to credit wallet');
    }
  }

  /**
   * Debit wallet (spend funds)
   */
  async debitWallet(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { amount, description, reference } = req.body;

      if (!amount || amount <= 0) {
        return ApiResponse.badRequest(res, 'Valid amount is required');
      }

      // Check sufficient balance
      const hasBalance = await walletService.hasSufficientBalance(userId, amount);
      if (!hasBalance) {
        return ApiResponse.badRequest(res, 'Insufficient balance');
      }

      const transaction = await walletService.debitWallet({
        userId,
        amount,
        description: description || 'Wallet debit',
        reference,
      });

      return ApiResponse.success(res, transaction, 'Wallet debited successfully');
    } catch (error: any) {
      logger.error(`Debit wallet error: ${error.message}`);
      return ApiResponse.error(res, error.message || 'Failed to debit wallet');
    }
  }

  /**
   * Transfer funds to another user
   */
  async transferFunds(req: Request, res: Response) {
    try {
      const fromUserId = (req as any).user.userId;
      const { toEmail, amount, description } = req.body;

      if (!toEmail || !amount || amount <= 0) {
        return ApiResponse.badRequest(res, 'Valid recipient email and amount are required');
      }

      // Find recipient user
      const User = require('../models/User.model').default;
      const toUser = await User.findOne({ email: toEmail.toLowerCase() });
      
      if (!toUser) {
        return ApiResponse.notFound(res, 'Recipient user not found');
      }

      if (toUser._id.toString() === fromUserId) {
        return ApiResponse.badRequest(res, 'Cannot transfer to yourself');
      }

      // Check sufficient balance
      const hasBalance = await walletService.hasSufficientBalance(fromUserId, amount);
      if (!hasBalance) {
        return ApiResponse.badRequest(res, 'Insufficient balance');
      }

      const transfer = await walletService.transferMoney(
        fromUserId,
        toUser._id.toString(),
        amount,
        description || 'Funds transfer'
      );

      return ApiResponse.success(res, transfer, 'Funds transferred successfully');
    } catch (error: any) {
      logger.error(`Transfer funds error: ${error.message}`);
      return ApiResponse.error(res, error.message || 'Failed to transfer funds');
    }
  }

  /**
   * Initialize wallet funding via Paystack
   */
  async initializeFunding(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { amount } = req.body;

      if (!amount || amount < 100) {
        return ApiResponse.badRequest(res, 'Minimum funding amount is ₦100');
      }

      // Get user email
      const User = require('../models/User.model').default;
      const user = await User.findById(userId);
      
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      // Initialize Paystack transaction
      const paystackService = require('../services/paystack/paystack.service').paystackService;
      const reference = `FUND-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

      const paymentData = await paystackService.initializeTransaction(
        user.email,
        amount,
        {
          userId: user._id.toString(),
          type: 'wallet_funding',
          reference,
        },
        reference
      );

      return ApiResponse.success(res, {
        authorization_url: paymentData.authorization_url,
        reference: paymentData.reference,
      }, 'Funding initialized successfully');
    } catch (error: any) {
      logger.error(`Initialize funding error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to initialize funding');
    }
  }

  /**
   * Verify wallet funding
   */
  async verifyFunding(req: Request, res: Response) {
    try {
      const { reference } = req.params;

      // Verify Paystack transaction
      const paystackService = require('../services/paystack/paystack.service').paystackService;
      const paymentData = await paystackService.verifyTransaction(reference);

      if (paymentData.status !== 'success') {
        return ApiResponse.badRequest(res, 'Payment verification failed');
      }

      // Get metadata
      const metadata = paymentData.metadata;
      if (!metadata || !metadata.userId || metadata.type !== 'wallet_funding') {
        return ApiResponse.badRequest(res, 'Invalid payment metadata');
      }

      // Credit wallet
      const transaction = await walletService.creditWallet({
        userId: metadata.userId,
        amount: paymentData.amount / 100, // Convert from kobo to naira
        description: 'Wallet funding via Paystack',
        reference,
        metadata: paymentData,
      });

      return ApiResponse.success(res, transaction, 'Wallet funded successfully');
    } catch (error: any) {
      logger.error(`Verify funding error: ${error.message}`);
      return ApiResponse.error(res, error.message || 'Failed to verify funding');
    }
  }
}

export const walletController = new WalletController();