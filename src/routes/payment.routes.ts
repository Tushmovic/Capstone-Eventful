import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticated, creatorOnly } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/payments/webhook:
 *   post:
 *     summary: Paystack webhook handler
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/webhook', paymentController.handleWebhook);

/**
 * @swagger
 * /api/v1/payments/my-payments:
 *   get:
 *     summary: Get current user's payments
 *     tags: [Payments]
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
 *           default: 10
 *     responses:
 *       200:
 *         description: Payments retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/my-payments', authenticated, paymentController.getMyPayments);

/**
 * @swagger
 * /api/v1/payments/event/{eventId}:
 *   get:
 *     summary: Get payments for an event (creator only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event payments retrieved
 *       403:
 *         description: Not event creator
 */
router.get('/event/:eventId', authenticated, creatorOnly, paymentController.getEventPayments);

/**
 * @swagger
 * /api/v1/payments/{reference}:
 *   get:
 *     summary: Get payment details by reference
 *     tags: [Payments]
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
 *         description: Payment details retrieved
 *       404:
 *         description: Payment not found
 */
router.get('/:reference', authenticated, paymentController.getPaymentDetails);

export default router;