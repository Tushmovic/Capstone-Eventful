import { Router } from 'express';
import { walletController } from '../controllers/wallet.controller';
import { authenticated } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: User wallet management
 */

/**
 * @swagger
 * /api/v1/wallet:
 *   get:
 *     summary: Get current user's wallet balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticated, walletController.getWallet);

/**
 * @swagger
 * /api/v1/wallet/transactions:
 *   get:
 *     summary: Get user's transaction history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/transactions', authenticated, walletController.getTransactions);

/**
 * @swagger
 * /api/v1/wallet/credit:
 *   post:
 *     summary: Credit wallet (add funds)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               reference:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wallet credited successfully
 *       400:
 *         description: Invalid amount
 *       401:
 *         description: Unauthorized
 */
router.post('/credit', authenticated, walletController.creditWallet);

/**
 * @swagger
 * /api/v1/wallet/debit:
 *   post:
 *     summary: Debit wallet (spend funds)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               reference:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wallet debited successfully
 *       400:
 *         description: Invalid amount or insufficient balance
 *       401:
 *         description: Unauthorized
 */
router.post('/debit', authenticated, walletController.debitWallet);

/**
 * @swagger
 * /api/v1/wallet/transfer:
 *   post:
 *     summary: Transfer funds to another user
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toEmail
 *               - amount
 *             properties:
 *               toEmail:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Funds transferred successfully
 *       400:
 *         description: Invalid request or insufficient balance
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Recipient not found
 */
router.post('/transfer', authenticated, walletController.transferFunds);

/**
 * @swagger
 * /api/v1/wallet/fund/initialize:
 *   post:
 *     summary: Initialize wallet funding via Paystack
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 100
 *     responses:
 *       200:
 *         description: Funding initialized successfully
 *       400:
 *         description: Invalid amount
 *       401:
 *         description: Unauthorized
 */
router.post('/fund/initialize', authenticated, walletController.initializeFunding);

/**
 * @swagger
 * /api/v1/wallet/fund/verify/{reference}:
 *   get:
 *     summary: Verify wallet funding
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Funding verified successfully
 *       400:
 *         description: Verification failed
 *       401:
 *         description: Unauthorized
 */
router.get('/fund/verify/:reference', authenticated, walletController.verifyFunding);

export default router;