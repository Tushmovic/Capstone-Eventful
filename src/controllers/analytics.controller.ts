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

  // 🔥 NEW: Get attendee analytics
  async getAttendeeAnalytics(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { range = '6months' } = req.query;

      // Get user's tickets
      const tickets = await Ticket.find({ user: userId })
        .populate('event')
        .sort({ purchaseDate: -1 });

      // Get user's payments
      const payments = await Payment.find({ userId, status: 'successful' });

      // Calculate stats
      const totalTicketsPurchased = tickets.length;
      const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);
      
      const activeTickets = tickets.filter((t: any) => 
        t.status === 'confirmed' && new Date((t.event as any)?.date) > new Date()
      ).length;
      
      const usedTickets = tickets.filter((t: any) => t.status === 'used').length;
      const cancelledTickets = tickets.filter((t: any) => t.status === 'cancelled').length;
      const expiredTickets = tickets.filter((t: any) => t.status === 'expired').length;

      // Favorite categories
      const categoryCount: Record<string, number> = {};
      tickets.forEach((ticket: any) => {
        const category = (ticket.event as any)?.category;
        if (category) {
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        }
      });
      
      const favoriteCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Monthly spending (last 6 months)
      const monthlySpending = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = month.toLocaleString('default', { month: 'short' });
        
        const monthPayments = payments.filter((p: any) => {
          const pDate = new Date(p.createdAt);
          return pDate.getMonth() === month.getMonth() && 
                 pDate.getFullYear() === month.getFullYear();
        });
        
        const amount = monthPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
        monthlySpending.push({ month: monthStr, amount });
      }

      // Upcoming events
      const upcomingEvents = tickets
        .filter((t: any) => 
          t.status === 'confirmed' && 
          new Date((t.event as any)?.date) > new Date()
        )
        .slice(0, 5)
        .map((t: any) => ({
          id: (t.event as any)._id,
          title: (t.event as any).title,
          date: (t.event as any).date,
          venue: (t.event as any).location?.venue,
          ticketNumber: t.ticketNumber
        }));

      // Recent activity
      const recentActivity = [
        ...payments.slice(0, 3).map((p: any) => ({
          type: 'purchase',
          description: `Purchased ticket for an event`,
          date: p.createdAt,
          amount: p.amount
        })),
        ...tickets.filter((t: any) => t.status === 'used').slice(0, 2).map((t: any) => ({
          type: 'used',
          description: `Attended ${(t.event as any).title}`,
          date: t.usedAt || t.updatedAt,
        })),
        ...tickets.filter((t: any) => t.status === 'cancelled').slice(0, 2).map((t: any) => ({
          type: 'refund',
          description: `Refund for ${(t.event as any).title}`,
          date: t.updatedAt,
          amount: t.price
        }))
      ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
       .slice(0, 5);

      return ApiResponse.success(res, {
        totalTicketsPurchased,
        totalSpent,
        activeTickets,
        usedTickets,
        cancelledTickets,
        expiredTickets,
        favoriteCategories,
        monthlySpending,
        upcomingEvents,
        recentActivity
      }, 'Attendee analytics retrieved successfully');
    } catch (error: any) {
      logger.error(`Get attendee analytics error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get attendee analytics');
    }
  }
}

export const analyticsController = new AnalyticsController();