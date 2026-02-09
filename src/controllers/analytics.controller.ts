import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics/analytics.service';
import { ApiResponse } from '../utils/response';
import { logger } from '../utils/logger';
import Event from '../models/Event.model'; // Add explicit imports
import Ticket from '../models/Ticket.model';
import Payment from '../models/Payment.model';

export class AnalyticsController {
  async getEventAnalytics(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const userId = (req as any).user.userId;

      const analytics = await analyticsService.getEventAnalytics(eventId, userId);
      
      return ApiResponse.success(res, analytics, 'Event analytics retrieved successfully');
    } catch (error: any) {
      logger.error(`Get event analytics controller error: ${error.message}`);
      
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return ApiResponse.forbidden(res, error.message);
      }
      
      return ApiResponse.error(res, 'Failed to get event analytics');
    }
  }

  async getUserAnalytics(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const analytics = await analyticsService.getUserAnalytics(userId);
      
      return ApiResponse.success(res, analytics, 'User analytics retrieved successfully');
    } catch (error: any) {
      logger.error(`Get user analytics controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get user analytics');
    }
  }

  async getDashboardStats(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { timeRange = '30d' } = req.query;

      // Get basic stats
      const [events, tickets, payments] = await Promise.all([
        Event.find({ creator: userId }),
        Ticket.find({ user: userId }),
        Payment.find({ userId, status: 'successful' }),
      ]);

      // Fix: Add type annotations to reduce parameters
      const totalRevenue = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

      // Fix: Add type annotations to filter and map parameters
      const upcomingEvents = events.filter((e: any) => new Date(e.date) > new Date()).length;

      return ApiResponse.success(res, {
        stats: {
          eventsCreated: events.length,
          ticketsPurchased: tickets.length,
          totalSpent: totalRevenue,
          upcomingEvents,
        },
        recentActivity: {
          // Fix: Add type annotations to map parameters
          recentEvents: events.slice(0, 5).map((e: any) => ({
            title: e.title,
            date: e.date,
            status: e.status,
          })),
          recentTickets: tickets.slice(0, 5).map((t: any) => ({
            event: t.event,
            purchaseDate: t.purchaseDate,
            status: t.status,
          })),
        },
      }, 'Dashboard stats retrieved successfully');
    } catch (error: any) {
      logger.error(`Get dashboard stats controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get dashboard stats');
    }
  }
}

export const analyticsController = new AnalyticsController();