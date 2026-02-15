import { Router } from 'express';
import { bookmarkController } from '../controllers/bookmark.controller';
import { authenticated } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Bookmarks
 *   description: Event bookmarking functionality
 */

/**
 * @swagger
 * /api/v1/bookmarks/my:
 *   get:
 *     summary: Get current user's bookmarked events
 *     tags: [Bookmarks]
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
 *           default: 12
 *     responses:
 *       200:
 *         description: Bookmarks retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/my', authenticated, bookmarkController.getMyBookmarks);

/**
 * @swagger
 * /api/v1/bookmarks/toggle/{eventId}:
 *   post:
 *     summary: Toggle bookmark for an event
 *     tags: [Bookmarks]
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
 *         description: Bookmark toggled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 */
router.post('/toggle/:eventId', authenticated, bookmarkController.toggleBookmark);

/**
 * @swagger
 * /api/v1/bookmarks/status/{eventId}:
 *   get:
 *     summary: Check if event is bookmarked by current user
 *     tags: [Bookmarks]
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
 *         description: Bookmark status retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/status/:eventId', authenticated, bookmarkController.checkBookmarkStatus);

/**
 * @swagger
 * /api/v1/bookmarks/count/{eventId}:
 *   get:
 *     summary: Get bookmark count for an event (public)
 *     tags: [Bookmarks]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bookmark count retrieved
 */
router.get('/count/:eventId', bookmarkController.getEventBookmarkCount);

export default router;