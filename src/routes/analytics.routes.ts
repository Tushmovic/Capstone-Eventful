import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticated, creatorOnly } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/analytics/dashboard:
 *   get:
 *     summary: Get creator dashboard statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 */
router.get('/dashboard', authenticated, creatorOnly, analyticsController.getDashboardStats);

/**
 * @swagger
 * /api/v1/analytics/event/{eventId}:
 *   get:
 *     summary: Get analytics for a specific event
 *     tags: [Analytics]
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
 *         description: Event analytics retrieved successfully
 */
router.get('/event/:eventId', authenticated, creatorOnly, analyticsController.getEventAnalytics);

/**
 * @swagger
 * /api/v1/analytics/revenue:
 *   get:
 *     summary: Get revenue analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue analytics retrieved successfully
 */
router.get('/revenue', authenticated, creatorOnly, analyticsController.getRevenueAnalytics);

/**
 * @swagger
 * /api/v1/analytics/attendee:
 *   get:
 *     summary: Get attendee analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [1month, 3months, 6months, 1year, all]
 *         default: 6months
 *     responses:
 *       200:
 *         description: Attendee analytics retrieved successfully
 */
router.get('/attendee', authenticated, analyticsController.getAttendeeAnalytics); // 🔥 NEW ROUTE

export default router;