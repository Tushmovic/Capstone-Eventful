import { Router } from 'express';
import { accountController } from '../controllers/account.controller';
import { authenticated } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Multi-account management
 */

/**
 * @swagger
 * /api/v1/accounts/my-accounts:
 *   get:
 *     summary: Get all accounts for current user
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accounts retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/my-accounts', authenticated, accountController.getMyAccounts);

/**
 * @swagger
 * /api/v1/accounts/active:
 *   get:
 *     summary: Get active account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active account retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/active', authenticated, accountController.getActiveAccount);

/**
 * @swagger
 * /api/v1/accounts/create:
 *   post:
 *     summary: Create a new account with different role
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [creator, eventee]
 *     responses:
 *       200:
 *         description: Account created successfully
 *       400:
 *         description: Invalid role
 *       409:
 *         description: Account already exists
 *       401:
 *         description: Unauthorized
 */
router.post('/create', authenticated, accountController.createAccount);

/**
 * @swagger
 * /api/v1/accounts/switch:
 *   post:
 *     summary: Switch to a different account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountId
 *               - role
 *             properties:
 *               accountId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [creator, eventee]
 *     responses:
 *       200:
 *         description: Switched account successfully
 *       404:
 *         description: Account not found
 *       401:
 *         description: Unauthorized
 */
router.post('/switch', authenticated, accountController.switchAccount);

export default router;