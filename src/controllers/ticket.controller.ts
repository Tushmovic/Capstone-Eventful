import { Request, Response } from 'express';
import { ticketService } from '../services/ticket.service';
import { ApiResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { clearCache } from '../middlewares/cache.middleware';
import Event from '../models/Event.model';
import Ticket from '../models/Ticket.model';

export class TicketController {
  async purchaseTicket(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { eventId, quantity } = req.body;

      const result = await ticketService.purchaseTicket({
        eventId,
        quantity,
        userId,
      });

      logger.info(`Ticket purchase initiated for event ${eventId} by user ${userId}`);
      
      return ApiResponse.success(res, {
        paymentUrl: result.paymentUrl,
        reference: result.reference,
        amount: result.amount,
        message: 'Proceed to payment page',
      }, 'Payment initialized successfully');
    } catch (error: any) {
      logger.error(`Purchase ticket controller error: ${error.message}`);
      
      if (error.message.includes('not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('available')) {
        return ApiResponse.badRequest(res, error.message);
      }
      
      return ApiResponse.error(res, 'Failed to initialize ticket purchase');
    }
  }

  async verifyPayment(req: Request, res: Response) {
    try {
      const { reference } = req.params;
      
      const result = await ticketService.verifyPayment(reference);

      if (!result.success) {
        return ApiResponse.badRequest(res, result.message);
      }

      if (result.ticket) {
        await clearCache(`event:${(result.ticket.event as any)._id}:tickets`);
        await clearCache(`user:${(result.ticket.user as any)._id}:tickets`);
      }

      logger.info(`Payment verified: ${reference}`);
      
      return ApiResponse.success(res, {
        ticket: result.ticket,
        message: result.message,
      }, 'Payment verified successfully');
    } catch (error: any) {
      logger.error(`Verify payment controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to verify payment');
    }
  }

  async verifyTicket(req: Request, res: Response) {
    try {
      const { ticketCode } = req.params;
      
      const result = await ticketService.verifyTicket(ticketCode);

      const responseData = {
        isValid: result.isValid,
        message: result.message,
        ticket: result.ticket ? {
          ticketNumber: result.ticket.ticketNumber,
          purchaseDate: result.ticket.purchaseDate,
          status: result.ticket.status,
          qrCode: result.ticket.qrCode,
        } : null,
        event: result.event ? {
          title: result.event.title,
          date: result.event.date,
          location: result.event.location,
        } : null,
        user: result.user ? {
          name: result.user.name,
          email: result.user.email,
        } : null,
      };

      logger.info(`Ticket verification attempted: ${ticketCode} - ${result.isValid ? 'VALID' : 'INVALID'}`);
      
      return ApiResponse.success(res, responseData, 'Ticket verification completed');
    } catch (error: any) {
      logger.error(`Verify ticket controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to verify ticket');
    }
  }

  async getMyTickets(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const filters = req.query;
      
      const tickets = await ticketService.getUserTickets(userId);

      // Apply client-side filtering if needed
      let filteredTickets = tickets;
      if (filters.status) {
        filteredTickets = tickets.filter((ticket: any) => ticket.status === filters.status);
      }
      if (filters.eventId) {
        filteredTickets = tickets.filter((ticket: any) => 
          ticket.event._id.toString() === filters.eventId
        );
      }

      // Pagination
      const page = parseInt(filters.page as string) || 1;
      const limit = parseInt(filters.limit as string) || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      
      const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

      return ApiResponse.success(res, {
        tickets: paginatedTickets,
        pagination: {
          page,
          limit,
          total: filteredTickets.length,
          pages: Math.ceil(filteredTickets.length / limit),
        },
      }, 'Tickets retrieved successfully');
    } catch (error: any) {
      logger.error(`Get my tickets controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get tickets');
    }
  }

  async getEventTickets(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const userId = (req as any).user.userId;
      
      const event = await Event.findOne({ _id: eventId, creator: userId });
      
      if (!event) {
        return ApiResponse.forbidden(res, 'You are not the creator of this event');
      }

      const tickets = await ticketService.getEventTickets(eventId);

      return ApiResponse.success(res, {
        event: {
          title: event.title,
          availableTickets: event.availableTickets,
          totalTickets: event.totalTickets,
        },
        tickets,
        summary: {
          total: tickets.length,
          confirmed: tickets.filter((t: any) => t.status === 'confirmed').length,
          used: tickets.filter((t: any) => t.status === 'used').length,
          cancelled: tickets.filter((t: any) => t.status === 'cancelled').length,
          totalRevenue: tickets
            .filter((t: any) => t.paymentStatus === 'successful')
            .reduce((sum: number, ticket: any) => sum + ticket.price, 0),
        },
      }, 'Event tickets retrieved successfully');
    } catch (error: any) {
      logger.error(`Get event tickets controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get event tickets');
    }
  }

  async cancelTicket(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { ticketId } = req.body;

      const ticket = await ticketService.cancelTicket(ticketId, userId);

      await clearCache(`event:${ticket.event._id}:tickets`);
      await clearCache(`user:${userId}:tickets`);
      await clearCache(`event:${ticket.event._id}`);

      logger.info(`Ticket cancelled: ${ticketId} by user ${userId}`);
      
      return ApiResponse.success(res, {
        ticket,
        message: 'Ticket cancelled successfully',
        refundNote: 'If eligible for refund, it will be processed within 5-7 business days',
      }, 'Ticket cancelled successfully');
    } catch (error: any) {
      logger.error(`Cancel ticket controller error: ${error.message}`);
      
      if (error.message.includes('not found') || error.message.includes('permission')) {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('Cannot cancel')) {
        return ApiResponse.badRequest(res, error.message);
      }
      
      return ApiResponse.error(res, 'Failed to cancel ticket');
    }
  }

  async getTicketDetails(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const userId = (req as any).user.userId;

      const ticket = await Ticket.findOne({ _id: ticketId, user: userId })
        .populate('event')
        .populate('user', 'name email profileImage');

      if (!ticket) {
        return ApiResponse.notFound(res, 'Ticket not found or you do not have permission');
      }

      return ApiResponse.success(res, ticket, 'Ticket details retrieved successfully');
    } catch (error: any) {
      logger.error(`Get ticket details controller error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get ticket details');
    }
  }
}

export const ticketController = new TicketController();