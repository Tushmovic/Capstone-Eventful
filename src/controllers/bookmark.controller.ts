import { Request, Response } from 'express';
import { bookmarkService } from '../services/bookmark.service';
import { ApiResponse } from '../utils/response';
import { logger } from '../utils/logger';

export class BookmarkController {
  /**
   * Toggle bookmark for an event
   */
  async toggleBookmark(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { eventId } = req.params;

      if (!eventId) {
        return ApiResponse.badRequest(res, 'Event ID is required');
      }

      const result = await bookmarkService.toggleBookmark(userId, eventId);

      const message = result.bookmarked 
        ? 'Event bookmarked successfully' 
        : 'Bookmark removed successfully';

      return ApiResponse.success(res, result, message);
    } catch (error: any) {
      logger.error(`Toggle bookmark error: ${error.message}`);
      
      if (error.message.includes('Event not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      
      return ApiResponse.error(res, 'Failed to toggle bookmark');
    }
  }

  /**
   * Get user's bookmarks
   */
  async getMyBookmarks(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { page = 1, limit = 12 } = req.query;

      const bookmarks = await bookmarkService.getUserBookmarks(userId);

      // Pagination
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 12;
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = pageNum * limitNum;
      
      const paginatedBookmarks = bookmarks.slice(startIndex, endIndex);

      return ApiResponse.success(res, {
        bookmarks: paginatedBookmarks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: bookmarks.length,
          pages: Math.ceil(bookmarks.length / limitNum),
        },
      }, 'Bookmarks retrieved successfully');
    } catch (error: any) {
      logger.error(`Get my bookmarks error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get bookmarks');
    }
  }

  /**
   * Check if event is bookmarked by current user
   */
  async checkBookmarkStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { eventId } = req.params;

      const isBookmarked = await bookmarkService.isBookmarked(userId, eventId);

      return ApiResponse.success(res, { isBookmarked }, 'Bookmark status retrieved');
    } catch (error: any) {
      logger.error(`Check bookmark status error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to check bookmark status');
    }
  }

  /**
   * Get bookmark count for an event (public)
   */
  async getEventBookmarkCount(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const count = await bookmarkService.getEventBookmarkCount(eventId);

      return ApiResponse.success(res, { count }, 'Bookmark count retrieved');
    } catch (error: any) {
      logger.error(`Get event bookmark count error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get bookmark count');
    }
  }
}

export const bookmarkController = new BookmarkController();