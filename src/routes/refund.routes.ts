import { Router } from 'express';
import { refundController } from '../controllers/refund.controller';
import { authenticated, adminOnly } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Refunds
 *   description: Ticket refund management
 */

/**
 * @swagger
 * /api/v1/refunds/ticket/{ticketId}/request:
 *   post:
 *     summary: Request refund for a ticket
 *     tags: [Refunds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund request processed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not ticket owner
 *       404:
 *         description: Ticket not found
 */
router.post('/ticket/:ticketId/request', authenticated, refundController.requestRefund);

/**
 * @swagger
 * /api/v1/refunds/ticket/{ticketId}/process:
 *   post:
 *     summary: Process refund for a ticket (creator/admin only)
 *     tags: [Refunds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Ticket not found
 */
router.post('/ticket/:ticketId/process', authenticated, refundController.processRefund);

/**
 * @swagger
 * /api/v1/refunds/event/{eventId}/process-all:
 *   post:
 *     summary: Process refunds for all tickets of a cancelled event (creator only)
 *     tags: [Refunds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event refunds processed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not event creator
 *       404:
 *         description: Event not found
 */
router.post('/event/:eventId/process-all', authenticated, refundController.processEventRefunds);

/**
 * @swagger
 * /api/v1/refunds/policy/{eventId}:
 *   get:
 *     summary: Get refund policy for an event
 *     tags: [Refunds]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Refund policy retrieved
 *       404:
 *         description: Event not found
 */
router.get('/policy/:eventId', refundController.getRefundPolicy);

/**
 * @swagger
 * /api/v1/refunds/ticket/{ticketId}/status:
 *   get:
 *     summary: Get refund status for a ticket
 *     tags: [Refunds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Refund status retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not ticket owner
 *       404:
 *         description: Ticket not found
 */
router.get('/ticket/:ticketId/status', authenticated, refundController.getRefundStatus);

/**
 * @swagger
 * /api/v1/refunds/pending:
 *   get:
 *     summary: Get all pending refund requests (admin only)
 *     tags: [Refunds]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending refunds retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin only
 */
router.get('/pending', authenticated, adminOnly, refundController.getPendingRefunds);

export default router;