import { Request, Response } from 'express';
import { refundService } from '../services/refund.service';
import { walletService } from '../services/wallet.service';
import { ApiResponse } from '../utils/response';
import { logger } from '../utils/logger';
import Ticket from '../models/Ticket.model';
import Event from '../models/Event.model';

export class RefundController {
  /**
   * Request a refund for a ticket
   */
  async requestRefund(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { ticketId } = req.params;
      const { reason } = req.body;

      const result = await refundService.requestRefund(ticketId, userId, reason || 'User requested refund');

      return ApiResponse.success(res, result, 'Refund request processed');
    } catch (error: any) {
      logger.error(`Request refund error: ${error.message}`);
      
      if (error.message.includes('not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('Unauthorized')) {
        return ApiResponse.forbidden(res, error.message);
      }
      
      return ApiResponse.error(res, 'Failed to process refund request');
    }
  }

  /**
   * Process refund for a ticket (creator/admin only)
   */
  async processRefund(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { ticketId } = req.params;
      const { reason } = req.body;

      // Check if user is admin or event creator
      const ticket = await Ticket.findById(ticketId).populate('event');
      if (!ticket) {
        return ApiResponse.notFound(res, 'Ticket not found');
      }

      const event = ticket.event as any;
      const userRole = (req as any).user.role;

      if (userRole !== 'admin' && event.creator.toString() !== userId) {
        return ApiResponse.forbidden(res, 'Only event creators or admins can process refunds');
      }

      const result = await refundService.processTicketRefund(ticketId, reason || 'Refund processed');

      return ApiResponse.success(res, result, 'Refund processed successfully');
    } catch (error: any) {
      logger.error(`Process refund error: ${error.message}`);
      return ApiResponse.error(res, error.message || 'Failed to process refund');
    }
  }

  /**
   * Process bulk refunds for cancelled event (creator only)
   */
  async processEventRefunds(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { eventId } = req.params;
      const { reason } = req.body;

      // Verify event ownership
      const event = await Event.findOne({ _id: eventId, creator: userId });
      if (!event) {
        return ApiResponse.forbidden(res, 'You are not the creator of this event');
      }

      const result = await refundService.processEventRefunds(eventId, reason || 'Event cancelled');

      return ApiResponse.success(res, result, 'Event refunds processed successfully');
    } catch (error: any) {
      logger.error(`Process event refunds error: ${error.message}`);
      return ApiResponse.error(res, error.message || 'Failed to process event refunds');
    }
  }

  /**
   * Get refund policy for an event
   */
  async getRefundPolicy(req: Request, res: Response) {
    try {
      const { eventId } = req.params;

      const event = await Event.findById(eventId);
      if (!event) {
        return ApiResponse.notFound(res, 'Event not found');
      }

      const policy = refundService.getRefundPolicy(event.date);

      return ApiResponse.success(res, policy, 'Refund policy retrieved');
    } catch (error: any) {
      logger.error(`Get refund policy error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get refund policy');
    }
  }

  /**
   * Get refund status for a ticket
   */
  async getRefundStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { ticketId } = req.params;

      const ticket = await Ticket.findById(ticketId)
        .populate('event')
        .populate('user');

      if (!ticket) {
        return ApiResponse.notFound(res, 'Ticket not found');
      }

      // Verify ownership
      if (ticket.user._id.toString() !== userId) {
        return ApiResponse.forbidden(res, 'You do not own this ticket');
      }

      const event = ticket.event as any;

      const status = {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        eventTitle: event.title,
        eventDate: event.date,
        purchaseDate: ticket.purchaseDate,
        price: ticket.price,
        paymentStatus: ticket.paymentStatus,
        ticketStatus: ticket.status,
        refundEligibility: await refundService.requestRefund(ticketId, userId, ''),
      };

      return ApiResponse.success(res, status, 'Refund status retrieved');
    } catch (error: any) {
      logger.error(`Get refund status error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get refund status');
    }
  }

  /**
   * Admin: Get all pending refund requests
   */
  async getPendingRefunds(req: Request, res: Response) {
    try {
      // This would require a RefundRequest model
      // For now, return placeholder
      return ApiResponse.success(res, { message: 'Pending refunds feature coming soon' }, 'Pending refunds');
    } catch (error: any) {
      logger.error(`Get pending refunds error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get pending refunds');
    }
  }
}

export const refundController = new RefundController();