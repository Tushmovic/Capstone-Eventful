import Ticket from '../models/Ticket.model';
import Event from '../models/Event.model';
import Payment from '../models/Payment.model';
import User from '../models/User.model';
import { walletService } from './wallet.service';
import RefundPolicy from '../policies/RefundPolicy';
import { logger } from '../utils/logger';
import { emailService } from '../config/email';
import { redisClient } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';

export class RefundService {
  /**
   * Process refund for a single ticket
   */
  async processTicketRefund(ticketId: string, reason: string): Promise<{
    success: boolean;
    refundAmount: number;
    message: string;
  }> {
    try {
      // Get ticket with event and user
      const ticket = await Ticket.findById(ticketId)
        .populate('event')
        .populate('user');

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Check if already refunded
      if (ticket.paymentStatus === 'refunded') {
        return {
          success: false,
          refundAmount: 0,
          message: 'Ticket already refunded',
        };
      }

      const event = ticket.event as any;
      const user = ticket.user as any;

      // Calculate refund amount based on policy
      const refundCalculation = RefundPolicy.calculateRefundAmount(
        ticket.price,
        event.date,
        ticket.purchaseDate
      );

      // Process refund to wallet
      const transaction = await walletService.refundWallet({
        userId: user._id.toString(),
        amount: refundCalculation.amount,
        description: `Refund for ticket #${ticket.ticketNumber} - ${event.title}`,
        reference: `REF-${ticket.paymentReference}`,
        metadata: {
          ticketId: ticket._id.toString(),
          eventId: event._id.toString(),
          originalAmount: ticket.price,
          refundPercentage: refundCalculation.percentage,
          reason,
        },
        relatedTicket: ticket._id.toString(),
        relatedEvent: event._id.toString(),
      });

      // Update ticket status
      ticket.paymentStatus = 'refunded';
      ticket.status = 'cancelled';
      await ticket.save();

      // Update payment record if exists
      if (ticket.paymentReference) {
        await Payment.findOneAndUpdate(
          { reference: ticket.paymentReference },
          { status: 'refunded' }
        );
      }

      // Send refund confirmation email
      await this.sendRefundEmail(user, event, ticket, refundCalculation);

      // Clear caches
      await redisClient.del(`wallet:${user._id}`);
      await redisClient.del(`transactions:${user._id}`);
      await redisClient.del(`user:${user._id}:tickets`);

      logger.info(`✅ Refund processed for ticket ${ticket.ticketNumber}: ₦${refundCalculation.amount}`);

      return {
        success: true,
        refundAmount: refundCalculation.amount,
        message: `Refund of ₦${refundCalculation.amount} processed successfully`,
      };
    } catch (error: any) {
      logger.error(`❌ Process ticket refund error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process refunds for all tickets of a cancelled event
   */
  async processEventRefunds(eventId: string, reason: string): Promise<{
    totalRefunded: number;
    ticketsProcessed: number;
    failedTickets: number;
  }> {
    try {
      const tickets = await Ticket.find({ event: eventId, paymentStatus: 'successful' })
        .populate('user');

      let totalRefunded = 0;
      let ticketsProcessed = 0;
      let failedTickets = 0;

      for (const ticket of tickets) {
        try {
          const result = await this.processTicketRefund(ticket._id.toString(), reason);
          if (result.success) {
            totalRefunded += result.refundAmount;
            ticketsProcessed++;
          } else {
            failedTickets++;
          }
        } catch (error) {
          failedTickets++;
          logger.error(`Failed to refund ticket ${ticket._id}: ${error}`);
        }
      }

      logger.info(`✅ Event refunds completed: ₦${totalRefunded} refunded across ${ticketsProcessed} tickets`);

      return {
        totalRefunded,
        ticketsProcessed,
        failedTickets,
      };
    } catch (error: any) {
      logger.error(`❌ Process event refunds error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Initiate refund request from user
   */
  async requestRefund(ticketId: string, userId: string, reason: string): Promise<{
    eligible: boolean;
    refundAmount: number;
    message: string;
    requiresApproval: boolean;
  }> {
    try {
      const ticket = await Ticket.findById(ticketId)
        .populate('event');

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Verify ticket belongs to user
      if (ticket.user.toString() !== userId) {
        throw new Error('Unauthorized');
      }

      const event = ticket.event as any;

      // Check refund eligibility
      const eligibility = RefundPolicy.checkRefundEligibility(
        event.date,
        ticket.purchaseDate,
        ticket.status,
        event.status
      );

      if (!eligibility.eligible) {
        return {
          eligible: false,
          refundAmount: 0,
          message: eligibility.reason,
          requiresApproval: false,
        };
      }

      // Calculate refund amount
      const refundAmount = (ticket.price * eligibility.refundPercentage) / 100;

      // If event is not cancelled, this requires approval
      const requiresApproval = event.status !== 'cancelled';

      return {
        eligible: true,
        refundAmount,
        message: eligibility.reason,
        requiresApproval,
      };
    } catch (error: any) {
      logger.error(`❌ Request refund error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Approve refund request (admin function)
   */
  async approveRefund(ticketId: string, adminId: string): Promise<any> {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Process the refund
      const result = await this.processTicketRefund(ticketId, 'Refund approved by admin');

      logger.info(`✅ Refund approved by admin ${adminId} for ticket ${ticketId}`);

      return result;
    } catch (error: any) {
      logger.error(`❌ Approve refund error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get refund policy for an event
   */
  getRefundPolicy(eventDate: Date): any {
    return {
      fullRefundDeadline: new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      halfRefundDeadline: new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      quarterRefundDeadline: new Date(eventDate.getTime() - 1 * 24 * 60 * 60 * 1000),
      policy: RefundPolicy.getRefundDeadlineDisplay(eventDate),
    };
  }

  /**
   * Send refund confirmation email
   */
  private async sendRefundEmail(user: any, event: any, ticket: any, refund: any): Promise<void> {
    try {
      const subject = `💰 Refund Processed for ${event.title}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #10B981;">💰 Refund Processed</h1>
          </div>
          
          <p>Dear ${user.name},</p>
          
          <p>We've processed your refund for the following ticket:</p>
          
          <div style="background: #f8f8f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${event.title}</h3>
            <p><strong>Ticket #:</strong> ${ticket.ticketNumber}</p>
            <p><strong>Refund Amount:</strong> ₦${refund.amount}</p>
            <p><strong>Refund Percentage:</strong> ${refund.percentage}%</p>
            <p><strong>Reason:</strong> ${refund.reason}</p>
          </div>
          
          <p>The refunded amount has been added to your wallet balance.</p>
          
          <p>You can view your updated balance in your wallet.</p>
          
          <p>Best regards,<br>The Eventful Team</p>
        </div>
      `;

      await emailService.sendEmail(user.email, subject, html);
    } catch (error: any) {
      logger.error(`❌ Send refund email error: ${error.message}`);
    }
  }
}

export const refundService = new RefundService();