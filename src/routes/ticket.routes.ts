import { Router } from 'express';
import { ticketController } from '../controllers/ticket.controller';
import { validateRequest, validateQuery } from '../middlewares/validation.middleware';
import { purchaseTicketSchema, verifyTicketSchema, cancelTicketSchema, ticketFilterSchema } from '../dtos/ticket.dto';
import { authenticated, creatorOnly } from '../middlewares/auth.middleware';
import { cacheMiddleware } from '../middlewares/cache.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Ticket management and purchasing
 */

/**
 * @swagger
 * /api/v1/tickets/purchase:
 *   post:
 *     summary: Purchase tickets for an event
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *               - quantity
 *             properties:
 *               eventId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payment initialized successfully
 *       400:
 *         description: Invalid request or insufficient tickets
 *       401:
 *         description: Unauthorized
 */
router.post('/purchase', authenticated, validateRequest(purchaseTicketSchema), ticketController.purchaseTicket);

/**
 * @swagger
 * /api/v1/tickets/verify/{reference}:
 *   get:
 *     summary: Verify payment and create ticket
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment verified and ticket created
 *       400:
 *         description: Payment verification failed
 */
router.get('/verify/:reference', ticketController.verifyPayment);

/**
 * @swagger
 * /api/v1/tickets/verify-ticket/{ticketCode}:
 *   get:
 *     summary: Verify ticket validity (for event organizers)
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: ticketCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket verification result
 *       404:
 *         description: Ticket not found
 */
router.get('/verify-ticket/:ticketCode', ticketController.verifyTicket);

/**
 * @swagger
 * /api/v1/tickets/my-tickets:
 *   get:
 *     summary: Get current user's tickets
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, used, cancelled, expired]
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
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
 *         description: User's tickets retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/my-tickets', authenticated, cacheMiddleware(300), validateQuery(ticketFilterSchema), ticketController.getMyTickets);

/**
 * @swagger
 * /api/v1/tickets/event/{eventId}:
 *   get:
 *     summary: Get tickets for a specific event (creator only)
 *     tags: [Tickets]
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
 *         description: Event tickets retrieved
 *       403:
 *         description: Not the event creator
 *       401:
 *         description: Unauthorized
 */
router.get('/event/:eventId', authenticated, creatorOnly, ticketController.getEventTickets);

/**
 * @swagger
 * /api/v1/tickets/cancel:
 *   post:
 *     summary: Cancel a ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticketId
 *             properties:
 *               ticketId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket cancelled successfully
 *       400:
 *         description: Cannot cancel ticket
 *       401:
 *         description: Unauthorized
 */
router.post('/cancel', authenticated, validateRequest(cancelTicketSchema), ticketController.cancelTicket);

/**
 * @swagger
 * /api/v1/tickets/{ticketId}:
 *   get:
 *     summary: Get ticket details
 *     tags: [Tickets]
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
 *         description: Ticket details retrieved
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:ticketId', authenticated, ticketController.getTicketDetails);

export default router;