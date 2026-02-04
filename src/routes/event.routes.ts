import { Router } from 'express';
import { eventController } from '../controllers/event.controller';
import { validateRequest, validateQuery } from '../middlewares/validation.middleware';
import { createEventSchema, updateEventSchema, eventFilterSchema } from '../dtos/event.dto';
import { authenticated, creatorOnly, creatorOrAdmin } from '../middlewares/auth.middleware';
import { upload, handleUploadError } from '../config/upload';
import { cacheMiddleware } from '../middlewares/cache.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management endpoints
 */

/**
 * @swagger
 * /api/v1/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventInput'
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticated, creatorOnly, validateRequest(createEventSchema), eventController.createEvent);

/**
 * @swagger
 * /api/v1/events:
 *   get:
 *     summary: Get all events with filtering
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated tags
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter events from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter events to date
 *       - in: query
 *         name: priceMin
 *         schema:
 *           type: number
 *         description: Minimum ticket price
 *       - in: query
 *         name: priceMax
 *         schema:
 *           type: number
 *         description: Maximum ticket price
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, price, createdAt, views]
 *           default: date
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get('/', cacheMiddleware(300), validateQuery(eventFilterSchema), eventController.getEvents);

/**
 * @swagger
 * /api/v1/events/categories:
 *   get:
 *     summary: Get all event categories
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', cacheMiddleware(3600), eventController.getEventCategories);

/**
 * @swagger
 * /api/v1/events/my-events:
 *   get:
 *     summary: Get events created by the authenticated user
 *     tags: [Events]
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
 *         description: User's events retrieved successfully
 */
router.get('/my-events', authenticated, creatorOnly, eventController.getMyEvents);

/**
 * @swagger
 * /api/v1/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: query
 *         name: incrementViews
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to increment view count
 *     responses:
 *       200:
 *         description: Event retrieved successfully
 *       404:
 *         description: Event not found
 */
router.get('/:id', cacheMiddleware(300), eventController.getEvent);

/**
 * @swagger
 * /api/v1/events/{id}:
 *   put:
 *     summary: Update event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventUpdate'
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       404:
 *         description: Event not found or no permission
 */
router.put('/:id', authenticated, creatorOnly, validateRequest(updateEventSchema), eventController.updateEvent);

/**
 * @swagger
 * /api/v1/events/{id}:
 *   delete:
 *     summary: Delete event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       404:
 *         description: Event not found or no permission
 */
router.delete('/:id', authenticated, creatorOnly, eventController.deleteEvent);

/**
 * @swagger
 * /api/v1/events/{id}/images:
 *   post:
 *     summary: Upload images for event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 *       400:
 *         description: No images uploaded
 *       404:
 *         description: Event not found or no permission
 */
router.post(
  '/:id/images',
  authenticated,
  creatorOnly,
  upload.array('images', 10),
  handleUploadError,
  eventController.uploadEventImages
);

/**
 * @swagger
 * /api/v1/events/{id}/images/{imageName}:
 *   delete:
 *     summary: Remove image from event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: imageName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image removed successfully
 *       404:
 *         description: Event not found or no permission
 */
router.delete('/:id/images/:imageName', authenticated, creatorOnly, eventController.removeEventImage);

/**
 * @swagger
 * /api/v1/events/{id}/share:
 *   post:
 *     summary: Share event and get sharing URLs
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sharing URLs generated successfully
 *       404:
 *         description: Event not found
 */
router.post('/:id/share', eventController.shareEvent);

export default router;