import { Request, Response } from 'express';
import { ApiResponse } from '../utils/response';
import { logger } from '../utils/logger';
import Event from '../models/Event.model';
import Ticket from '../models/Ticket.model';
import Payment from '../models/Payment.model';

export class AnalyticsController {
  async getEventAnalytics(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const userId = (req as any).user.userId;

      // Verify ownership
      const event = await Event.findOne({ _id: eventId, creator: userId });
      if (!event) {
        return ApiResponse.forbidden(res, 'Event not found or unauthorized');
      }

      // Get tickets
      const tickets = await Ticket.find({ event: eventId });
      const payments = await Payment.find({ eventId, status: 'successful' });

      // Calculate analytics
      const totalTicketsSold = tickets.length;
      const usedTickets = tickets.filter(t => t.status === 'used').length;
      const totalRevenue = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

      return ApiResponse.success(res, {
        event: {
          id: event._id,
          title: event.title,
          date: event.date,
          totalTickets: event.totalTickets,
          availableTickets: event.availableTickets,
          ticketPrice: event.ticketPrice
        },
        tickets: {
          total: totalTicketsSold,
          confirmed: tickets.filter(t => t.status === 'confirmed').length,
          used: usedTickets,
          cancelled: tickets.filter(t => t.status === 'cancelled').length,
          soldOutPercentage: event.totalTickets > 0 
            ? ((event.totalTickets - event.availableTickets) / event.totalTickets * 100).toFixed(2)
            : '0',
          attendanceRate: totalTicketsSold > 0
            ? (usedTickets / totalTicketsSold * 100).toFixed(2)
            : '0'
        },
        revenue: {
          total: totalRevenue,
          averageTicketPrice: totalTicketsSold > 0 ? (totalRevenue / totalTicketsSold).toFixed(2) : '0'
        }
      }, 'Event analytics retrieved successfully');
    } catch (error: any) {
      logger.error(`Get event analytics error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get event analytics');
    }
  }

  async getDashboardStats(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;

      // Get all events by creator
      const events = await Event.find({ creator: userId });
      const eventIds = events.map(e => e._id);

      // Get all tickets and payments
      const tickets = await Ticket.find({ event: { $in: eventIds } });
      const payments = await Payment.find({ 
        eventId: { $in: eventIds }, 
        status: 'successful' 
      });

      // Calculate totals
      const totalEvents = events.length;
      const totalTicketsSold = tickets.length;
      const totalRevenue = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
      
      // Upcoming events
      const now = new Date();
      const upcomingEvents = events
        .filter((e: any) => e.date > now && e.status === 'published')
        .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
        .slice(0, 5)
        .map((e: any) => ({
          id: e._id,
          title: e.title,
          date: e.date,
          location: e.location?.venue || 'N/A',
          ticketsSold: e.totalTickets - e.availableTickets,
          totalTickets: e.totalTickets
        }));

      return ApiResponse.success(res, {
        summary: {
          totalEvents,
          publishedEvents: events.filter((e: any) => e.status === 'published').length,
          draftEvents: events.filter((e: any) => e.status === 'draft').length,
          completedEvents: events.filter((e: any) => e.status === 'completed').length,
          totalTicketsSold,
          totalRevenue
        },
        upcomingEvents,
        recentActivity: {
          recentEvents: events.slice(0, 5).map((e: any) => ({
            title: e.title,
            date: e.date,
            status: e.status,
            ticketsSold: e.totalTickets - e.availableTickets
          }))
        }
      }, 'Dashboard stats retrieved successfully');
    } catch (error: any) {
      logger.error(`Get dashboard stats error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get dashboard stats');
    }
  }

  async getRevenueAnalytics(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { period = 'monthly' } = req.query;

      const events = await Event.find({ creator: userId });
      const eventIds = events.map(e => e._id);
      
      const payments = await Payment.find({ 
        eventId: { $in: eventIds }, 
        status: 'successful' 
      }).sort({ createdAt: 1 });

      // Group by period
      const revenueByPeriod: Record<string, number> = {};
      
      payments.forEach((payment: any) => {
        const date = new Date(payment.createdAt);
        let key: string;
        
        if (period === 'daily') {
          key = date.toISOString().split('T')[0];
        } else if (period === 'weekly') {
          const week = Math.ceil(date.getDate() / 7);
          key = `${date.getFullYear()}-W${week}`;
        } else if (period === 'yearly') {
          key = date.getFullYear().toString();
        } else { // monthly
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        revenueByPeriod[key] = (revenueByPeriod[key] || 0) + payment.amount;
      });

      // Format for chart
      const chartData = Object.entries(revenueByPeriod).map(([period, amount]) => ({
        period,
        amount
      }));

      return ApiResponse.success(res, {
        summary: {
          totalRevenue: payments.reduce((sum: number, p: any) => sum + p.amount, 0),
          totalTransactions: payments.length,
          averageTransactionValue: payments.length > 0 
            ? payments.reduce((sum: number, p: any) => sum + p.amount, 0) / payments.length 
            : 0
        },
        chartData,
        period
      }, 'Revenue analytics retrieved successfully');
    } catch (error: any) {
      logger.error(`Get revenue analytics error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get revenue analytics');
    }
  }
}

export const analyticsController = new AnalyticsController();