import { Request, Response } from 'express';
import { eventService } from '../services/event.service';
import { ApiResponse } from '../utils/response';
import { validateRequest, validateQuery } from '../middlewares/validation.middleware';
import { createEventSchema, updateEventSchema, eventFilterSchema } from '../dtos/event.dto';
import { logger } from '../utils/logger';
import { getFileUrl } from '../config/upload';
import { cacheMiddleware, clearCache, generateCacheKey } from '../middlewares/cache.middleware';

export class EventController {
  async createEvent(req: Request, res: Response) {
    try {
      const creatorId = (req as any).user.userId;
      const eventData = req.body;

      const event = await eventService.createEvent(eventData, creatorId);

      // Clear cache for creator's events and all events
      await clearCache(`events:*`);
      await clearCache(`events:creator:${creatorId}:*`);

      logger.info(`Event created: ${event._id} by user ${creatorId}`);
      return ApiResponse.created(res, event, 'Event created successfully');
    } catch (error: any) {
      logger.error(`Create event controller error: ${error.message}`);
      
      if (error.name === 'ValidationError') {
        return ApiResponse.badRequest(res, 'Validation failed', error.errors);
      }
      
      return ApiResponse.error(res, 'Failed to create event');
    }
  }

  async getEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const incrementViews = req.query.incrementViews === 'true';

      const event = await eventService.getEventById(id, incrementViews);

      if (!event) {
        return ApiResponse.notFound(res, 'Event not found');
      }

      // Check if user can view the event
      const userId = (req as any).user?.userId;
      if (event.visibility === 'private' && event.creator._id.toString() !== userId) {
        return ApiResponse.forbidden(res, 'You do not have permission to view this event');
      }

      // Convert image filenames to URLs
      const eventWithUrls = {
        ...event,
        images: event.images.map(img => getFileUrl(img))
      };

      return ApiResponse.success(res, eventWithUrls, 'Event retrieved successfully');
    } catch (error: any) {
      logger.error(`Get event controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get event');
    }
  }

  async updateEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const creatorId = (req as any).user.userId;
      const updates = req.body;

      const event = await eventService.updateEvent(id, updates, creatorId);

      if (!event) {
        return ApiResponse.notFound(res, 'Event not found or you do not have permission');
      }

      // Clear cache
      await clearCache(`events:*`);
      await clearCache(`events:${id}`);
      await clearCache(`events:creator:${creatorId}:*`);

      logger.info(`Event updated: ${id} by user ${creatorId}`);
      return ApiResponse.success(res, event, 'Event updated successfully');
    } catch (error: any) {
      logger.error(`Update event controller error: ${error.message}`);
      
      if (error.name === 'ValidationError') {
        return ApiResponse.badRequest(res, 'Validation failed', error.errors);
      }
      
      return ApiResponse.error(res, 'Failed to update event');
    }
  }

  async deleteEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const creatorId = (req as any).user.userId;

      const deleted = await eventService.deleteEvent(id, creatorId);

      if (!deleted) {
        return ApiResponse.notFound(res, 'Event not found or you do not have permission');
      }

      // Clear cache
      await clearCache(`events:*`);
      await clearCache(`events:${id}`);
      await clearCache(`events:creator:${creatorId}:*`);

      logger.info(`Event deleted: ${id} by user ${creatorId}`);
      return ApiResponse.success(res, null, 'Event deleted successfully');
    } catch (error: any) {
      logger.error(`Delete event controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to delete event');
    }
  }

  async getEvents(req: Request, res: Response) {
    try {
      const filters = req.query;
      const page = parseInt(filters.page as string) || 1;
      const limit = parseInt(filters.limit as string) || 10;

      // Parse tags if provided as comma-separated string
      if (typeof filters.tags === 'string') {
        filters.tags = (filters.tags as string).split(',').map(tag => tag.trim());
      }

      const result = await eventService.getEvents(filters as any, page, limit);

      // Convert image filenames to URLs
      const eventsWithUrls = result.events.map(event => ({
        ...event,
        images: event.images.map(img => getFileUrl(img))
      }));

      return ApiResponse.success(res, {
        events: eventsWithUrls,
        pagination: result.pagination
      }, 'Events retrieved successfully');
    } catch (error: any) {
      logger.error(`Get events controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get events');
    }
  }

  async getMyEvents(req: Request, res: Response) {
    try {
      const creatorId = (req as any).user.userId;
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;

      const result = await eventService.getEventsByCreator(creatorId, pageNum, limitNum);

      // Convert image filenames to URLs
      const eventsWithUrls = result.events.map(event => ({
        ...event,
        images: event.images.map(img => getFileUrl(img))
      }));

      return ApiResponse.success(res, {
        events: eventsWithUrls,
        pagination: result.pagination
      }, 'Your events retrieved successfully');
    } catch (error: any) {
      logger.error(`Get my events controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get your events');
    }
  }

  async uploadEventImages(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const creatorId = (req as any).user.userId;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return ApiResponse.badRequest(res, 'No images uploaded');
      }

      const event = await eventService.addEventImages(id, creatorId, files);

      if (!event) {
        return ApiResponse.notFound(res, 'Event not found or you do not have permission');
      }

      // Clear cache
      await clearCache(`events:${id}`);

      // Convert image filenames to URLs
      const eventWithUrls = {
        ...event.toObject(),
        images: event.images.map(img => getFileUrl(img))
      };

      logger.info(`Images uploaded to event: ${id} by user ${creatorId}`);
      return ApiResponse.success(res, eventWithUrls, 'Images uploaded successfully');
    } catch (error: any) {
      logger.error(`Upload event images controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to upload images');
    }
  }

  async removeEventImage(req: Request, res: Response) {
    try {
      const { id, imageName } = req.params;
      const creatorId = (req as any).user.userId;

      const event = await eventService.removeEventImage(id, creatorId, imageName);

      if (!event) {
        return ApiResponse.notFound(res, 'Event not found or you do not have permission');
      }

      // Clear cache
      await clearCache(`events:${id}`);

      // Convert image filenames to URLs
      const eventWithUrls = {
        ...event.toObject(),
        images: event.images.map(img => getFileUrl(img))
      };

      logger.info(`Image removed from event: ${id} by user ${creatorId}`);
      return ApiResponse.success(res, eventWithUrls, 'Image removed successfully');
    } catch (error: any) {
      logger.error(`Remove event image controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to remove image');
    }
  }

  async shareEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Increment share count
      const event = await eventService.incrementEventShares(id);

      if (!event) {
        return ApiResponse.notFound(res, 'Event not found');
      }

      // Get share URLs
      const shareUrls = await eventService.getEventShareUrl(id);

      return ApiResponse.success(res, {
        message: 'Event shared successfully',
        shareCount: event.shareCount,
        shareUrls
      }, 'Event shared successfully');
    } catch (error: any) {
      logger.error(`Share event controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to share event');
    }
  }

  async getEventCategories(req: Request, res: Response) {
    try {
      // Use mongoose model's distinct method
      const categories = await Event.distinct('category');
      
      // Get count for each category
      const categoriesWithCount = await Promise.all(
        categories.map(async (category: string) => {
          const count = await Event.countDocuments({ 
            category, 
            status: 'published', 
            visibility: 'public' 
          });
          return { category, count };
        })
      );

      return ApiResponse.success(res, categoriesWithCount, 'Categories retrieved successfully');
    } catch (error: any) {
      logger.error(`Get event categories controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get categories');
    }
  }
}

export const eventController = new EventController();