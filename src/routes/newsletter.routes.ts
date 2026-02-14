import { Router } from 'express';
import { newsletterController } from '../controllers/newsletter.controller';
import { authenticated, adminOnly } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/newsletter/subscribe:
 *   post:
 *     summary: Subscribe to newsletter
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscribed successfully
 */
router.post('/subscribe', newsletterController.subscribe);

/**
 * @swagger
 * /api/v1/newsletter/unsubscribe:
 *   post:
 *     summary: Unsubscribe from newsletter
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Unsubscribed successfully
 */
router.post('/unsubscribe', newsletterController.unsubscribe);

/**
 * @swagger
 * /api/v1/newsletter/subscribers:
 *   get:
 *     summary: Get all subscribers (admin only)
 *     tags: [Newsletter]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscribers retrieved
 */
router.get('/subscribers', authenticated, adminOnly, newsletterController.getSubscribers);

export default router;