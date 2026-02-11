import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticated } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Event reminders and notification preferences
 */

/**
 * @swagger
 * /api/v1/notifications/reminders:
 *   post:
 *     summary: Set a reminder for an event
 *     tags: [Notifications]
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
 *               - reminderType
 *             properties:
 *               eventId:
 *                 type: string
 *               reminderType:
 *                 type: string
 *                 enum: [1h, 1d, 1w, custom]
 *               customTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Reminder set successfully
 */
router.post('/reminders', authenticated, notificationController.setReminder);

/**
 * @swagger
 * /api/v1/notifications/reminders:
 *   get:
 *     summary: Get all reminders for current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reminders retrieved successfully
 */
router.get('/reminders', authenticated, notificationController.getMyReminders);

/**
 * @swagger
 * /api/v1/notifications/reminders/{eventId}:
 *   delete:
 *     summary: Delete a reminder
 *     tags: [Notifications]
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
 *         description: Reminder deleted successfully
 */
router.delete('/reminders/:eventId', authenticated, notificationController.deleteReminder);

/**
 * @swagger
 * /api/v1/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
 */
router.get('/preferences', authenticated, notificationController.getNotificationPreferences);

/**
 * @swagger
 * /api/v1/notifications/preferences:
 *   put:
 *     summary: Update notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: boolean
 *               sms:
 *                 type: boolean
 *               push:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 */
router.put('/preferences', authenticated, notificationController.updateNotificationPreferences);

export default router;