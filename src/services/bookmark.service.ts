import Bookmark from '../models/Bookmark.model';
import Event from '../models/Event.model';
import { IBookmarkInput, IBookmarkResponse } from '../interfaces/bookmark.interface';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';

export class BookmarkService {
  /**
   * Toggle bookmark for a user
   * If bookmark exists, remove it; if not, create it
   */
  async toggleBookmark(userId: string, eventId: string): Promise<{ bookmarked: boolean }> {
    try {
      // Check if event exists
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Check if bookmark exists
      const existingBookmark = await Bookmark.findOne({ user: userId, event: eventId });

      if (existingBookmark) {
        // Remove bookmark
        await existingBookmark.deleteOne();
        
        // Clear cache
        await redisClient.del(`bookmarks:${userId}`);
        
        logger.info(`✅ Bookmark removed for user ${userId} on event ${eventId}`);
        return { bookmarked: false };
      } else {
        // Create bookmark
        const bookmark = new Bookmark({
          user: userId,
          event: eventId,
        });
        await bookmark.save();

        // Clear cache
        await redisClient.del(`bookmarks:${userId}`);

        logger.info(`✅ Bookmark added for user ${userId} on event ${eventId}`);
        return { bookmarked: true };
      }
    } catch (error: any) {
      logger.error(`❌ Toggle bookmark error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all bookmarks for a user
   */
  async getUserBookmarks(userId: string): Promise<IBookmarkResponse[]> {
    try {
      const cacheKey = `bookmarks:${userId}`;
      
      // Try cache first
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch (cacheError) {
        logger.warn(`⚠️ Cache read failed for bookmarks of user ${userId}`);
      }

      // Get from database
      const bookmarks = await Bookmark.find({ user: userId })
        .populate({
          path: 'event',
          select: 'title description date location ticketPrice images category',
          populate: {
            path: 'creator',
            select: 'name email profileImage'
          }
        })
        .sort({ createdAt: -1 })
        .lean();

      // Format response
      const formattedBookmarks = bookmarks.map(bookmark => ({
        _id: bookmark._id.toString(),
        user: {
          _id: (bookmark.user as any)._id?.toString() || '',
          name: (bookmark.user as any)?.name || '',
          email: (bookmark.user as any)?.email || '',
        },
        event: {
          _id: (bookmark.event as any)._id?.toString() || '',
          title: (bookmark.event as any)?.title || '',
          description: (bookmark.event as any)?.description || '',
          date: (bookmark.event as any)?.date || new Date(),
          location: (bookmark.event as any)?.location || { venue: '', city: '' },
          ticketPrice: ((bookmark.event as any)?.ticketPrice || 0) / 100, // Convert from kobo to Naira
          images: (bookmark.event as any)?.images || [],
          category: (bookmark.event as any)?.category || '',
        },
        createdAt: bookmark.createdAt || new Date(),
      }));

      // Store in cache
      try {
        await redisClient.set(cacheKey, JSON.stringify(formattedBookmarks), 300); // 5 minutes cache
      } catch (cacheError) {
        logger.warn(`⚠️ Cache write failed for bookmarks of user ${userId}`);
      }

      return formattedBookmarks;
    } catch (error: any) {
      logger.error(`❌ Get user bookmarks error: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if a user has bookmarked a specific event
   */
  async isBookmarked(userId: string, eventId: string): Promise<boolean> {
    try {
      const bookmark = await Bookmark.findOne({ user: userId, event: eventId });
      return !!bookmark;
    } catch (error: any) {
      logger.error(`❌ Check bookmark error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get bookmark count for an event
   */
  async getEventBookmarkCount(eventId: string): Promise<number> {
    try {
      return await Bookmark.countDocuments({ event: eventId });
    } catch (error: any) {
      logger.error(`❌ Get bookmark count error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Remove all bookmarks for an event (when event is deleted)
   */
  async removeEventBookmarks(eventId: string): Promise<void> {
    try {
      // Get all users who bookmarked this event to clear their cache
      const bookmarks = await Bookmark.find({ event: eventId }).select('user');
      
      // Delete bookmarks
      await Bookmark.deleteMany({ event: eventId });

      // Clear cache for each user
      const userIds = [...new Set(bookmarks.map(b => b.user.toString()))];
      for (const userId of userIds) {
        await redisClient.del(`bookmarks:${userId}`);
      }

      logger.info(`✅ Removed all bookmarks for event ${eventId}`);
    } catch (error: any) {
      logger.error(`❌ Remove event bookmarks error: ${error.message}`);
    }
  }
}

export const bookmarkService = new BookmarkService();