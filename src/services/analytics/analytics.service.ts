import Event from '../../models/Event.model';
import Ticket from '../../models/Ticket.model';
import Payment from '../../models/Payment.model';
import { logger } from '../../utils/logger';

export class AnalyticsService {
  async getEventAnalytics(eventId: string, creatorId: string) {
    try {
      // Verify ownership
      const event = await Event.findOne({ _id: eventId, creator: creatorId });
      if (!event) {
        throw new Error('Event not found or unauthorized');
      }

      const [
        tickets,
        payments,
      ] = await Promise.all([
        Ticket.find({ event: eventId }),
        Payment.find({ eventId }),
      ]);

      const successfulPayments = payments.filter(p => p.status === 'successful');
      const revenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
      const usedTickets = tickets.filter(t => t.status === 'used').length;

      return {
        event: {
          title: event.title,
          totalTickets: event.totalTickets,
          availableTickets: event.availableTickets,
        },
        tickets: {
          total: tickets.length,
          confirmed: tickets.filter(t => t.status === 'confirmed').length,
          used: usedTickets,
          cancelled: tickets.filter(t => t.status === 'cancelled').length,
          pending: tickets.filter(t => t.status === 'pending').length,
        },
        payments: {
          total: payments.length,
          successful: successfulPayments.length,
          failed: payments.filter(p => p.status === 'failed').length,
          revenue,
          averageTicketPrice: successfulPayments.length > 0 ? revenue / successfulPayments.length : 0,
        },
        metrics: {
          soldOutPercentage: (event.totalTickets - event.availableTickets) / event.totalTickets * 100,
          attendanceRate: event.totalTickets > 0 ? usedTickets / (event.totalTickets - event.availableTickets) * 100 : 0,
        },
      };
    } catch (error: any) {
      logger.error(`Get event analytics error: ${error.message}`);
      throw error;
    }
  }

  async getUserAnalytics(userId: string) {
    try {
      const [events, payments] = await Promise.all([
        Event.find({ creator: userId }),
        Payment.find({ userId }),
      ]);

      const successfulPayments = payments.filter(p => p.status === 'successful');
      const totalRevenue = events.reduce((sum, event) => {
        const eventPayments = successfulPayments.filter(p => p.eventId.toString() === event._id.toString());
        return sum + eventPayments.reduce((eventSum, p) => eventSum + p.amount, 0);
      }, 0);

      return {
        summary: {
          totalEvents: events.length,
          activeEvents: events.filter(e => e.status === 'published').length,
          totalRevenue,
          totalAttendees: successfulPayments.length,
        },
        events: events.map(event => ({
          title: event.title,
          status: event.status,
          date: event.date,
          soldTickets: event.totalTickets - event.availableTickets,
          totalTickets: event.totalTickets,
        })),
      };
    } catch (error: any) {
      logger.error(`Get user analytics error: ${error.message}`);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();